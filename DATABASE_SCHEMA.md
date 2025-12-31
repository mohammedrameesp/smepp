# Database Schema Documentation

This document describes all database tables, their fields, and their purposes.

**Total Tables: 54**

---

## Table of Contents

1. [Authentication & Users](#1-authentication--users)
2. [Multi-Tenant Organization](#2-multi-tenant-organization)
3. [Assets Module](#3-assets-module)
4. [Subscriptions Module](#4-subscriptions-module)
5. [Suppliers Module](#5-suppliers-module)
6. [HR & Employees](#6-hr--employees)
7. [Leave Management](#7-leave-management)
8. [Payroll Management](#8-payroll-management)
9. [Purchase Requests](#9-purchase-requests)
10. [Asset Requests](#10-asset-requests)
11. [Approval Workflow](#11-approval-workflow)
12. [Company Documents](#12-company-documents)
13. [Depreciation](#13-depreciation)
14. [Notifications](#14-notifications)
15. [Activity & Audit](#15-activity--audit)
16. [AI Chat](#16-ai-chat)
17. [WhatsApp Integration](#17-whatsapp-integration)
18. [System Settings](#18-system-settings)

---

## 1. Authentication & Users

### Account
OAuth provider accounts linked to users (NextAuth.js standard).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `userId` | String | FK to User - which user owns this account |
| `type` | String | Account type (oauth, credentials) |
| `provider` | String | OAuth provider name (google, azure-ad) |
| `providerAccountId` | String | User's ID at the OAuth provider |
| `refresh_token` | String? | OAuth refresh token for token renewal |
| `access_token` | String? | OAuth access token for API calls |
| `expires_at` | Int? | Token expiration timestamp |
| `token_type` | String? | Token type (usually "Bearer") |
| `scope` | String? | OAuth scopes granted |
| `id_token` | String? | OpenID Connect ID token |
| `session_state` | String? | OAuth session state |

### Session
Active user sessions (NextAuth.js standard).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `sessionToken` | String | Unique session identifier (stored in cookie) |
| `userId` | String | FK to User - session owner |
| `expires` | DateTime | When session expires |

### User
All users in the system (employees, admins, super admins).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `name` | String? | Display name |
| `email` | String | Unique email address (login identifier) |
| `emailVerified` | DateTime? | When email was verified |
| `image` | String? | Profile picture URL |
| `passwordHash` | String? | Hashed password for email/password auth |
| `role` | Role | System role (ADMIN, EMPLOYEE, MANAGER, etc.) |
| `isSystemAccount` | Boolean | True for shared/system accounts (not real users) |
| `isSuperAdmin` | Boolean | Platform-level admin (manages all organizations) |
| `isEmployee` | Boolean | Appears in HR/payroll lists |
| `canLogin` | Boolean | Can authenticate to the system |
| `isOnWps` | Boolean | Included in WPS (Wage Protection System) payroll |
| `resetToken` | String? | Password reset token |
| `resetTokenExpiry` | DateTime? | When reset token expires |
| `passwordChangedAt` | DateTime? | Last password change (invalidates old sessions) |
| `failedLoginAttempts` | Int | Brute-force protection counter |
| `lockedUntil` | DateTime? | Account locked until this time |
| `setupToken` | String? | Initial password setup token (new employees) |
| `setupTokenExpiry` | DateTime? | When setup token expires |
| `isDeleted` | Boolean | Soft-delete flag |
| `deletedAt` | DateTime? | When user was soft-deleted |
| `scheduledDeletionAt` | DateTime? | Permanent deletion date (7 days after soft-delete) |
| `deletedByUserId` | String? | Who deleted this user |
| `twoFactorSecret` | String? | Encrypted TOTP secret for 2FA |
| `twoFactorEnabled` | Boolean | Is 2FA enabled |
| `twoFactorBackupCodes` | String[] | Hashed one-time backup codes |
| `pending2FATokenJti` | String? | Current pending 2FA token ID (prevents replay) |
| `twoFactorVerifiedAt` | DateTime? | Last 2FA verification (for re-verification) |

### VerificationToken
Email verification tokens (NextAuth.js standard).

| Field | Type | Purpose |
|-------|------|---------|
| `identifier` | String | Email being verified |
| `token` | String | Unique verification token |
| `expires` | DateTime | When token expires |

---

## 2. Multi-Tenant Organization

### Organization
Each tenant/company in the SaaS platform.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `name` | String | Company name |
| `slug` | String | URL-friendly identifier (subdomain) |
| `logoUrl` | String? | Company logo URL |
| `primaryColor` | String | Brand primary color (hex) |
| `secondaryColor` | String? | Brand accent color |
| `loginBackgroundUrl` | String? | Custom login page background |
| `welcomeTitle` | String? | Custom welcome message title |
| `welcomeSubtitle` | String? | Custom welcome message subtitle |
| `timezone` | String | Company timezone (default: Asia/Qatar) |
| `currency` | String | Primary currency (default: QAR) |
| `codePrefix` | String | Prefix for reference numbers (EMP-001, AST-001) |
| `codeFormats` | Json | Custom code format patterns per entity type |
| `industry` | String? | Business industry (for analytics) |
| `companySize` | String? | Employee count range |
| `internalNotes` | String? | Super-admin only notes |
| `enabledModules` | String[] | Which modules are active |
| `aiChatEnabled` | Boolean | AI assistant feature enabled |
| `aiTokenBudgetMonthly` | Int? | Custom AI token limit |
| `additionalCurrencies` | String[] | Secondary currencies enabled |
| `onboardingCompleted` | Boolean | Setup wizard completed |
| `onboardingCompletedAt` | DateTime? | When onboarding finished |
| `onboardingStep` | Int | Current wizard step |
| `subscriptionTier` | Enum | FREE or PLUS |
| `stripeCustomerId` | String? | Stripe customer for billing |
| `stripePriceId` | String? | Current subscription price |
| `stripeSubEnd` | DateTime? | Subscription end date |
| `maxUsers` | Int | User limit for this org |
| `maxAssets` | Int | Asset limit for this org |
| `allowedAuthMethods` | String[] | Restricted auth methods |
| `allowedEmailDomains` | String[] | Email domain whitelist |
| `enforceDomainRestriction` | Boolean | Block logins from other domains |
| `customGoogleClientId` | String? | Custom OAuth app ID |
| `customGoogleClientSecret` | String? | Custom OAuth app secret (encrypted) |
| `customAzureClientId` | String? | Custom Azure AD app ID |
| `customAzureClientSecret` | String? | Custom Azure AD secret (encrypted) |
| `customAzureTenantId` | String? | Azure AD tenant restriction |
| `whatsAppSource` | Enum | NONE, PLATFORM, or CUSTOM |
| `whatsAppPlatformEnabled` | Boolean | Can use platform WhatsApp |

### OrganizationUser
User membership in organizations (many-to-many with roles).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `organizationId` | String | FK to Organization |
| `userId` | String | FK to User |
| `role` | OrgRole | OWNER, ADMIN, MANAGER, or MEMBER |
| `isOwner` | Boolean | Original organization creator |
| `joinedAt` | DateTime | When user joined |

### OrganizationInvitation
Pending invitations to join an organization.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `organizationId` | String | FK to Organization |
| `email` | String | Invitee's email |
| `name` | String? | Pre-filled name for signup |
| `role` | OrgRole | Role to assign on acceptance |
| `token` | String | Unique invitation token |
| `invitedById` | String? | Who sent the invitation |
| `expiresAt` | DateTime | Invitation expiry |
| `acceptedAt` | DateTime? | When invitation was accepted |

### RolePermission
Custom permissions for MANAGER and MEMBER roles per organization.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `role` | OrgRole | MANAGER or MEMBER |
| `permission` | String | Permission key (e.g., "assets:view") |

### OrganizationSetupProgress
Onboarding checklist tracking for each organization.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `organizationId` | String | FK to Organization |
| `profileComplete` | Boolean | Company info configured |
| `logoUploaded` | Boolean | Logo has been uploaded |
| `brandingConfigured` | Boolean | Colors customized |
| `firstAssetAdded` | Boolean | At least one asset created |
| `firstTeamMemberInvited` | Boolean | At least one invite sent |
| `firstEmployeeAdded` | Boolean | At least one HR profile created |
| `isDismissed` | Boolean | User dismissed the checklist |

### RevokedImpersonationToken
Super admin impersonation tokens that have been revoked (security).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `jti` | String | JWT ID being revoked |
| `revokedAt` | DateTime | When revoked |
| `revokedBy` | String | Super admin who revoked |
| `reason` | String? | Reason for revocation |
| `superAdminId` | String | Original token issuer |
| `organizationId` | String | Target organization |
| `organizationSlug` | String | Target org slug |
| `issuedAt` | DateTime | Original token issue time |
| `expiresAt` | DateTime | Original token expiry |

---

## 3. Assets Module

### Asset
Physical and digital assets owned by the organization.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization (tenant isolation) |
| `assetTag` | String? | Unique asset identifier (e.g., AST-001) |
| `type` | String | Asset type (Laptop, Monitor, Vehicle, etc.) |
| `category` | String? | Department/category (IT, Marketing, etc.) |
| `brand` | String? | Manufacturer (Apple, Dell, HP) |
| `model` | String | Model name/number |
| `serial` | String? | Serial number |
| `configuration` | String? | Specs (16GB RAM, 512GB SSD) |
| `purchaseDate` | DateTime? | When purchased |
| `warrantyExpiry` | DateTime? | Warranty end date (for alerts) |
| `supplier` | String? | Vendor/seller |
| `invoiceNumber` | String? | Purchase invoice/PO number |
| `assignedUserId` | String? | Currently assigned to user |
| `assignmentDate` | DateTime? | When assigned to current user |
| `status` | AssetStatus | IN_USE, SPARE, REPAIR, DISPOSED |
| `acquisitionType` | Enum | NEW_PURCHASE or TRANSFERRED |
| `transferNotes` | String? | Notes for transferred assets |
| `price` | Decimal? | Purchase price |
| `priceCurrency` | String? | Original currency |
| `priceQAR` | Decimal? | Price converted to QAR |
| `notes` | String? | General notes |
| `location` | String? | Physical location |
| `isShared` | Boolean | Shared resource (printer, etc.) |
| `depreciationCategoryId` | String? | FK to depreciation category |
| `salvageValue` | Decimal? | Residual value after depreciation |
| `customUsefulLifeMonths` | Int? | Override category useful life |
| `depreciationStartDate` | DateTime? | When depreciation started |
| `accumulatedDepreciation` | Decimal? | Total depreciation to date |
| `netBookValue` | Decimal? | Current book value |
| `lastDepreciationDate` | DateTime? | Last depreciation calculation |
| `isFullyDepreciated` | Boolean | Asset fully depreciated |

### AssetHistory
Audit trail of all asset changes (assignments, status changes).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `assetId` | String | FK to Asset |
| `action` | Enum | ASSIGNED, UNASSIGNED, STATUS_CHANGED, etc. |
| `fromUserId` | String? | Previous assignee |
| `toUserId` | String? | New assignee |
| `fromStatus` | Enum? | Previous status |
| `toStatus` | Enum? | New status |
| `fromLocation` | String? | Previous location |
| `toLocation` | String? | New location |
| `notes` | String? | Change notes |
| `performedBy` | String? | Who made the change |
| `assignmentDate` | DateTime? | Assignment date (for ASSIGNED) |
| `returnDate` | DateTime? | Return date (for UNASSIGNED) |

### MaintenanceRecord
Asset maintenance/repair history.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `assetId` | String | FK to Asset |
| `maintenanceDate` | DateTime | When maintenance occurred |
| `notes` | String? | What was done |
| `performedBy` | String? | Who performed maintenance |

---

## 4. Subscriptions Module

### Subscription
Software subscriptions and recurring services.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `serviceName` | String | Service name (e.g., "Microsoft 365") |
| `category` | String? | Category (Productivity, Development, etc.) |
| `accountId` | String? | Account/license ID |
| `purchaseDate` | DateTime? | When purchased |
| `renewalDate` | DateTime? | Next renewal date (for alerts) |
| `billingCycle` | Enum | MONTHLY, YEARLY, ONE_TIME |
| `costPerCycle` | Decimal? | Cost per billing period |
| `costCurrency` | String? | Original currency |
| `costQAR` | Decimal? | Cost converted to QAR |
| `vendor` | String? | Vendor/provider |
| `status` | Enum | ACTIVE, PAUSED, CANCELLED |
| `assignedUserId` | String? | User assigned to this subscription |
| `autoRenew` | Boolean | Auto-renewal enabled |
| `paymentMethod` | String? | How it's paid |
| `notes` | String? | General notes |
| `lastActiveRenewalDate` | DateTime? | Last renewal before cancel |
| `cancelledAt` | DateTime? | When cancelled |
| `reactivatedAt` | DateTime? | When reactivated |

### SubscriptionHistory
Audit trail of subscription changes.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `subscriptionId` | String | FK to Subscription |
| `action` | Enum | CREATED, REACTIVATED, CANCELLED, RENEWED, REASSIGNED |
| `oldStatus` | Enum? | Previous status |
| `newStatus` | Enum? | New status |
| `oldRenewalDate` | DateTime? | Previous renewal date |
| `newRenewalDate` | DateTime? | New renewal date |
| `reactivationDate` | DateTime? | When reactivated |
| `assignmentDate` | DateTime? | When reassigned |
| `oldUserId` | String? | Previous assignee |
| `newUserId` | String? | New assignee |
| `notes` | String? | Change notes |
| `performedBy` | String? | Who made the change |

---

## 5. Suppliers Module

### Supplier
Vendor/supplier directory.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `suppCode` | String? | Supplier code (SUPP-001) |
| `name` | String | Company name |
| `category` | String | Material/service category |
| `address` | String? | Street address |
| `city` | String? | City |
| `country` | String? | Country |
| `website` | String? | Website URL |
| `establishmentYear` | Int? | Year established |
| `primaryContactName` | String? | Main contact name |
| `primaryContactTitle` | String? | Main contact title |
| `primaryContactEmail` | String? | Main contact email |
| `primaryContactMobile` | String? | Main contact phone |
| `secondaryContactName` | String? | Backup contact name |
| `secondaryContactTitle` | String? | Backup contact title |
| `secondaryContactEmail` | String? | Backup contact email |
| `secondaryContactMobile` | String? | Backup contact phone |
| `paymentTerms` | String? | Payment terms |
| `additionalInfo` | String? | Portfolio, certifications |
| `status` | Enum | PENDING, APPROVED, REJECTED |
| `rejectionReason` | String? | Why rejected |
| `approvedAt` | DateTime? | When approved |
| `approvedById` | String? | Who approved |

### SupplierEngagement
Interactions/transactions with suppliers.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `supplierId` | String | FK to Supplier |
| `date` | DateTime | Engagement date |
| `notes` | String | What happened |
| `rating` | Int? | 1-5 star rating |
| `createdById` | String | Who recorded this |

---

## 6. HR & Employees

### HRProfile
Employee HR information (linked to User).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User (unique - one profile per user) |
| `dateOfBirth` | DateTime? | Birth date |
| `gender` | String? | Male/Female/Other |
| `maritalStatus` | String? | Single/Married/Divorced/Widowed |
| `nationality` | String? | Country of origin |
| `qatarMobile` | String? | Qatar phone (8 digits) |
| `otherMobileCode` | String? | Other country code |
| `otherMobileNumber` | String? | Other phone number |
| `personalEmail` | String? | Personal email |
| `qatarZone` | String? | Qatar address - zone |
| `qatarStreet` | String? | Qatar address - street |
| `qatarBuilding` | String? | Qatar address - building |
| `qatarUnit` | String? | Qatar address - unit |
| `homeCountryAddress` | String? | Home country full address |
| `localEmergencyName` | String? | Local emergency contact name |
| `localEmergencyRelation` | String? | Relationship |
| `localEmergencyPhoneCode` | String? | Country code |
| `localEmergencyPhone` | String? | Phone number |
| `homeEmergencyName` | String? | Home country emergency contact |
| `homeEmergencyRelation` | String? | Relationship |
| `homeEmergencyPhoneCode` | String? | Country code |
| `homeEmergencyPhone` | String? | Phone number |
| `qidNumber` | String? | Qatar ID number |
| `qidExpiry` | DateTime? | QID expiry (for alerts) |
| `passportNumber` | String? | Passport number |
| `passportExpiry` | DateTime? | Passport expiry (for alerts) |
| `healthCardExpiry` | DateTime? | Health card expiry |
| `sponsorshipType` | String? | Company/Family/Work Permit |
| `employeeId` | String? | Employee code (EMP-001) |
| `designation` | String? | Job title |
| `dateOfJoining` | DateTime? | Employment start date |
| `terminationDate` | DateTime? | Employment end date |
| `terminationReason` | String? | Reason for leaving |
| `hajjLeaveTaken` | Boolean | Has used Hajj leave (once per employment) |
| `bypassNoticeRequirement` | Boolean | Skip leave notice requirements |
| `bankName` | String? | Bank name for salary |
| `iban` | String? | Bank account IBAN |
| `highestQualification` | String? | Education level |
| `specialization` | String? | Field of study |
| `institutionName` | String? | University/college |
| `graduationYear` | Int? | Year graduated |
| `qidUrl` | String? | QID document URL |
| `passportCopyUrl` | String? | Passport copy URL |
| `photoUrl` | String? | Employee photo URL |
| `contractCopyUrl` | String? | Contract document URL |
| `contractExpiry` | DateTime? | Contract/work permit expiry |
| `hasDrivingLicense` | Boolean | Has Qatar driving license |
| `licenseExpiry` | DateTime? | License expiry |
| `languagesKnown` | String? | Languages (JSON array) |
| `skillsCertifications` | String? | Skills (JSON array) |
| `onboardingStep` | Int | Current onboarding wizard step |
| `onboardingComplete` | Boolean | Onboarding finished |

### ProfileChangeRequest
Employee requests to update their HR profile.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `hrProfileId` | String | FK to HRProfile |
| `description` | String | What changes are requested |
| `status` | Enum | PENDING, APPROVED, REJECTED |
| `resolvedById` | String? | Admin who resolved |
| `resolvedAt` | DateTime? | When resolved |
| `resolverNotes` | String? | Admin's notes |

---

## 7. Leave Management

### LeaveType
Types of leave available (Annual, Sick, Hajj, etc.).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `name` | String | Leave type name |
| `description` | String? | Description |
| `color` | String | Calendar display color |
| `defaultDays` | Int | Default annual entitlement |
| `requiresApproval` | Boolean | Needs manager approval |
| `requiresDocument` | Boolean | Requires supporting document |
| `isPaid` | Boolean | Is this paid leave |
| `isActive` | Boolean | Currently available |
| `maxConsecutiveDays` | Int? | Max days in a row |
| `minNoticeDays` | Int | Advance notice required |
| `allowCarryForward` | Boolean | Can carry to next year |
| `maxCarryForwardDays` | Int? | Max days to carry |
| `minimumServiceMonths` | Int | Required months of service |
| `isOnceInEmployment` | Boolean | Can only use once (Hajj) |
| `serviceBasedEntitlement` | Json? | Days based on service length |
| `payTiers` | Json? | Sick leave pay tiers |
| `category` | Enum | STANDARD, MEDICAL, PARENTAL, RELIGIOUS |
| `genderRestriction` | String? | MALE or FEMALE only |
| `accrualBased` | Boolean | Entitlement accrues monthly |

### LeaveBalance
Employee leave balances per type per year.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User |
| `leaveTypeId` | String | FK to LeaveType |
| `year` | Int | Calendar year |
| `entitlement` | Decimal | Total days entitled |
| `used` | Decimal | Days already used |
| `pending` | Decimal | Days in pending requests |
| `carriedForward` | Decimal | Days from previous year |
| `adjustment` | Decimal | Manual adjustments (+/-) |
| `adjustmentNotes` | String? | Reason for adjustment |

### LeaveRequest
Employee leave requests.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `requestNumber` | String | Reference (LR-00001) |
| `userId` | String | Employee requesting leave |
| `leaveTypeId` | String | Type of leave |
| `startDate` | DateTime | Leave start date |
| `endDate` | DateTime | Leave end date |
| `requestType` | Enum | FULL_DAY, HALF_DAY_AM, HALF_DAY_PM |
| `totalDays` | Decimal | Total working days |
| `reason` | String? | Reason for leave |
| `documentUrl` | String? | Supporting document |
| `status` | Enum | PENDING, APPROVED, REJECTED, CANCELLED |
| `approverId` | String? | Who approved |
| `approvedAt` | DateTime? | When approved |
| `approverNotes` | String? | Approver's notes |
| `rejectedAt` | DateTime? | When rejected |
| `rejectionReason` | String? | Why rejected |
| `cancelledAt` | DateTime? | When cancelled |
| `cancellationReason` | String? | Why cancelled |
| `createdById` | String? | Who submitted (if on behalf) |
| `emergencyContact` | String? | Contact during leave |
| `emergencyPhone` | String? | Contact phone |

### LeaveRequestHistory
Audit trail of leave request changes.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `leaveRequestId` | String | FK to LeaveRequest |
| `action` | String | What happened |
| `oldStatus` | Enum? | Previous status |
| `newStatus` | Enum? | New status |
| `changes` | Json? | Field changes |
| `notes` | String? | Notes |
| `performedById` | String | Who made change |

---

## 8. Payroll Management

### SalaryStructure
Employee salary breakdown (one per employee).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User (unique) |
| `basicSalary` | Decimal | Base salary in QAR |
| `housingAllowance` | Decimal | Housing allowance |
| `transportAllowance` | Decimal | Transport allowance |
| `foodAllowance` | Decimal | Food allowance |
| `phoneAllowance` | Decimal | Phone allowance |
| `otherAllowances` | Decimal | Other allowances total |
| `otherAllowancesDetails` | String? | Breakdown JSON |
| `grossSalary` | Decimal | Total monthly salary |
| `currency` | String | Currency (QAR) |
| `effectiveFrom` | DateTime | When this structure started |
| `effectiveTo` | DateTime? | When it ended (if replaced) |
| `isActive` | Boolean | Currently active structure |

### SalaryStructureHistory
Salary change history (raises, adjustments).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `salaryStructureId` | String | FK to SalaryStructure |
| `action` | String | CREATED, UPDATED, DEACTIVATED |
| `changes` | Json? | What changed |
| `previousValues` | Json? | Previous salary values |
| `notes` | String? | Reason for change |
| `performedById` | String | Who made change |

### PayrollRun
Monthly payroll processing batch.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `referenceNumber` | String | Reference (PAY-2024-01-001) |
| `year` | Int | Payroll year |
| `month` | Int | Payroll month (1-12) |
| `periodStart` | DateTime | Pay period start |
| `periodEnd` | DateTime | Pay period end |
| `status` | Enum | DRAFT, PENDING_APPROVAL, APPROVED, PROCESSED, PAID, CANCELLED |
| `totalGross` | Decimal | Total gross salaries |
| `totalDeductions` | Decimal | Total deductions |
| `totalNet` | Decimal | Total net pay |
| `employeeCount` | Int | Employees in this run |
| `wpsFileGenerated` | Boolean | WPS file created |
| `wpsFileUrl` | String? | WPS file download URL |
| `wpsGeneratedAt` | DateTime? | When WPS was generated |
| `submittedById` | String? | Who submitted for approval |
| `submittedAt` | DateTime? | When submitted |
| `approvedById` | String? | Who approved |
| `approvedAt` | DateTime? | When approved |
| `approverNotes` | String? | Approval notes |
| `processedById` | String? | Who processed |
| `processedAt` | DateTime? | When processed |
| `paidById` | String? | Who marked as paid |
| `paidAt` | DateTime? | When marked paid |
| `paymentReference` | String? | Bank reference |
| `createdById` | String | Who created |

### PayrollHistory
Payroll run status change history.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `payrollRunId` | String | FK to PayrollRun |
| `action` | String | What happened |
| `previousStatus` | Enum? | Previous status |
| `newStatus` | Enum? | New status |
| `changes` | Json? | Changes made |
| `notes` | String? | Notes |
| `performedById` | String | Who made change |

### Payslip
Individual employee payslip for a payroll run.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `payslipNumber` | String | Reference (PS-2024-01-00001) |
| `payrollRunId` | String | FK to PayrollRun |
| `userId` | String | FK to User |
| `basicSalary` | Decimal | Snapshot of basic salary |
| `housingAllowance` | Decimal | Housing allowance |
| `transportAllowance` | Decimal | Transport allowance |
| `foodAllowance` | Decimal | Food allowance |
| `phoneAllowance` | Decimal | Phone allowance |
| `otherAllowances` | Decimal | Other allowances |
| `otherAllowancesDetails` | String? | Breakdown |
| `grossSalary` | Decimal | Total gross |
| `totalDeductions` | Decimal | Total deductions |
| `netSalary` | Decimal | Net pay |
| `bankName` | String? | Bank (from HR profile) |
| `iban` | String? | IBAN (from HR profile) |
| `qidNumber` | String? | QID (for WPS) |
| `isPaid` | Boolean | Payment completed |
| `paidAt` | DateTime? | When paid |

### PayslipDeduction
Individual deductions on a payslip.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `payslipId` | String | FK to Payslip |
| `type` | Enum | UNPAID_LEAVE, LOAN_REPAYMENT, ADVANCE_DEDUCTION, OTHER |
| `description` | String | Description |
| `amount` | Decimal | Deduction amount |
| `leaveRequestId` | String? | FK to LeaveRequest (if unpaid leave) |
| `loanId` | String? | FK to EmployeeLoan (if loan) |
| `advanceId` | String? | FK to advance (if advance) |

### EmployeeLoan
Employee loans and advances.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `loanNumber` | String | Reference (LOAN-00001) |
| `userId` | String | FK to User |
| `type` | String | LOAN or ADVANCE |
| `description` | String | Purpose of loan |
| `principalAmount` | Decimal | Original loan amount |
| `totalAmount` | Decimal | Total including fees |
| `monthlyDeduction` | Decimal | Monthly repayment |
| `totalPaid` | Decimal | Amount repaid so far |
| `remainingAmount` | Decimal | Outstanding balance |
| `startDate` | DateTime | When deductions start |
| `endDate` | DateTime? | Expected payoff date |
| `installments` | Int | Number of installments |
| `installmentsPaid` | Int | Installments completed |
| `status` | Enum | ACTIVE, PAUSED, COMPLETED, WRITTEN_OFF |
| `approvedById` | String? | Who approved |
| `approvedAt` | DateTime? | When approved |
| `notes` | String? | Notes |
| `createdById` | String | Who created |

### LoanRepayment
Individual loan repayment records.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `loanId` | String | FK to EmployeeLoan |
| `amount` | Decimal | Repayment amount |
| `payslipId` | String? | FK to Payslip (if salary deduction) |
| `paymentDate` | DateTime | When payment made |
| `paymentMethod` | String | SALARY_DEDUCTION, CASH, BANK_TRANSFER |
| `reference` | String? | Payment reference |
| `notes` | String? | Notes |
| `recordedById` | String | Who recorded |

---

## 9. Purchase Requests

### PurchaseRequest
Internal procurement requests.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `referenceNumber` | String | Reference (PR-2401-0001) |
| `requestDate` | DateTime | When requested |
| `status` | Enum | PENDING, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED |
| `priority` | Enum | LOW, MEDIUM, HIGH, URGENT |
| `requesterId` | String | FK to User (requester) |
| `title` | String | Request title |
| `description` | String? | Description |
| `justification` | String? | Business justification |
| `neededByDate` | DateTime? | When needed |
| `purchaseType` | Enum | HARDWARE, SOFTWARE_SUBSCRIPTION, SERVICES, etc. |
| `costType` | Enum | OPERATING_COST or PROJECT_COST |
| `projectName` | String? | Project name (if project cost) |
| `paymentMode` | Enum | BANK_TRANSFER, CREDIT_CARD, CASH, etc. |
| `vendorName` | String? | Preferred vendor |
| `vendorContact` | String? | Vendor contact |
| `vendorEmail` | String? | Vendor email |
| `additionalNotes` | String? | Notes |
| `totalAmount` | Decimal | Total cost |
| `currency` | String | Currency |
| `totalAmountQAR` | Decimal? | Total in QAR |
| `totalOneTime` | Decimal? | One-time costs |
| `totalMonthly` | Decimal? | Monthly recurring |
| `totalContractValue` | Decimal? | Total contract value |
| `reviewedById` | String? | Reviewer |
| `reviewedAt` | DateTime? | When reviewed |
| `reviewNotes` | String? | Review notes |
| `completedAt` | DateTime? | When completed |
| `completionNotes` | String? | Completion notes |

### PurchaseRequestItem
Line items in a purchase request.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `purchaseRequestId` | String | FK to PurchaseRequest |
| `itemNumber` | Int | Line number (1, 2, 3...) |
| `description` | String | Item description |
| `quantity` | Int | Quantity needed |
| `unitPrice` | Decimal | Price per unit |
| `currency` | String | Currency |
| `unitPriceQAR` | Decimal? | Unit price in QAR |
| `totalPrice` | Decimal | Line total |
| `totalPriceQAR` | Decimal? | Line total in QAR |
| `billingCycle` | Enum | ONE_TIME, MONTHLY, YEARLY |
| `durationMonths` | Int? | Duration for subscriptions |
| `amountPerCycle` | Decimal? | Recurring cost |
| `productUrl` | String? | Product link |
| `category` | String? | Item category |
| `supplier` | String? | Preferred supplier |
| `notes` | String? | Notes |

### PurchaseRequestHistory
Purchase request status changes.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `purchaseRequestId` | String | FK to PurchaseRequest |
| `action` | String | What happened |
| `previousStatus` | Enum? | Old status |
| `newStatus` | Enum? | New status |
| `performedById` | String | Who made change |
| `details` | String? | Change details |

---

## 10. Asset Requests

### AssetRequest
Employee requests for assets, admin assignments, and returns.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `requestNumber` | String | Reference (AR-240101-001) |
| `type` | Enum | EMPLOYEE_REQUEST, ADMIN_ASSIGNMENT, RETURN_REQUEST |
| `status` | Enum | PENDING_ADMIN_APPROVAL, PENDING_USER_ACCEPTANCE, etc. |
| `assetId` | String | FK to Asset |
| `userId` | String | Target user |
| `reason` | String? | Reason for request |
| `notes` | String? | Additional notes |
| `assignedById` | String? | Admin who assigned |
| `processedById` | String? | Who processed |
| `processedAt` | DateTime? | When processed |
| `processorNotes` | String? | Processor notes |
| `expiresAt` | DateTime? | Request expiry |

### AssetRequestHistory
Asset request status changes.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `assetRequestId` | String | FK to AssetRequest |
| `action` | String | What happened |
| `oldStatus` | Enum? | Previous status |
| `newStatus` | Enum? | New status |
| `notes` | String? | Notes |
| `performedById` | String | Who made change |

---

## 11. Approval Workflow

### ApprovalPolicy
Multi-level approval rules (e.g., purchases over 10,000 QAR need director approval).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `name` | String | Policy name |
| `module` | Enum | LEAVE_REQUEST, PURCHASE_REQUEST, ASSET_REQUEST |
| `isActive` | Boolean | Policy is active |
| `minAmount` | Decimal? | Minimum amount threshold |
| `maxAmount` | Decimal? | Maximum amount threshold |
| `minDays` | Int? | Minimum days (for leave) |
| `maxDays` | Int? | Maximum days (for leave) |
| `priority` | Int | Higher = checked first |

### ApprovalLevel
Levels within an approval policy.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `policyId` | String | FK to ApprovalPolicy |
| `levelOrder` | Int | Order (1, 2, 3...) |
| `approverRole` | Role | Role required (MANAGER, DIRECTOR, etc.) |

### ApprovalStep
Actual approval steps for a specific request.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `entityType` | Enum | Which module |
| `entityId` | String | Request ID |
| `levelOrder` | Int | Which level |
| `requiredRole` | Role | Role needed |
| `approverId` | String? | Who approved |
| `status` | Enum | PENDING, APPROVED, REJECTED, SKIPPED |
| `actionAt` | DateTime? | When action taken |
| `notes` | String? | Approver notes |

### ApproverDelegation
Temporary approval delegation (e.g., while on leave).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `delegatorId` | String | User delegating |
| `delegateeId` | String | User receiving delegation |
| `startDate` | DateTime | Delegation start |
| `endDate` | DateTime | Delegation end |
| `isActive` | Boolean | Currently active |
| `reason` | String? | Reason (e.g., "On leave") |

---

## 12. Company Documents

### CompanyDocumentType
Types of company documents (admin-managed).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `name` | String | Type name |
| `code` | String | System code |
| `category` | String | COMPANY or VEHICLE |
| `description` | String? | Description |
| `isActive` | Boolean | Currently available |
| `sortOrder` | Int | Display order |

### CompanyDocument
Actual company documents (licenses, registrations, vehicle papers).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `documentTypeId` | String | FK to CompanyDocumentType |
| `referenceNumber` | String? | Document number |
| `issuedBy` | String? | Issuing authority |
| `expiryDate` | DateTime | Expiry date (for alerts) |
| `documentUrl` | String? | File URL |
| `assetId` | String? | FK to Asset (for vehicle docs) |
| `renewalCost` | Decimal? | Renewal cost |
| `notes` | String? | Notes |
| `createdById` | String | Who uploaded |

---

## 13. Depreciation

### DepreciationCategory
Asset depreciation categories (Qatar tax rates).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `name` | String | Category name |
| `code` | String | System code (BUILDINGS, VEHICLES) |
| `annualRate` | Decimal | Depreciation rate % |
| `usefulLifeYears` | Int | Expected useful life |
| `description` | String? | Description |
| `isActive` | Boolean | Currently available |

### DepreciationRecord
Monthly depreciation calculations for assets.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `assetId` | String | FK to Asset |
| `periodStart` | DateTime | Period start |
| `periodEnd` | DateTime | Period end |
| `depreciationAmount` | Decimal | This period's depreciation |
| `accumulatedAmount` | Decimal | Total accumulated |
| `netBookValue` | Decimal | Current book value |
| `calculationType` | String | SCHEDULED or MANUAL |
| `calculatedAt` | DateTime | When calculated |
| `calculatedById` | String? | Who calculated |
| `notes` | String? | Notes |

---

## 14. Notifications

### Notification
In-app notifications for users.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `recipientId` | String | FK to User |
| `type` | Enum | Notification type |
| `title` | String | Notification title |
| `message` | String | Notification body |
| `link` | String? | Click URL |
| `entityType` | String? | Related entity type |
| `entityId` | String? | Related entity ID |
| `isRead` | Boolean | Has been read |
| `readAt` | DateTime? | When read |

---

## 15. Activity & Audit

### ActivityLog
System-wide audit log of all actions.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `actorUserId` | String? | Who performed action |
| `action` | String | What was done |
| `entityType` | String? | Entity type affected |
| `entityId` | String? | Entity ID affected |
| `payload` | Json? | Action details |
| `at` | DateTime | When it happened |

---

## 16. AI Chat

### ChatConversation
AI assistant conversations.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User |
| `title` | String? | Auto-generated title |

### ChatMessage
Individual messages in a conversation.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `conversationId` | String | FK to ChatConversation |
| `role` | String | "user" or "assistant" |
| `content` | String | Message content |
| `functionCalls` | Json? | Function calls made |

### AIChatUsage
Token usage tracking for billing.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User |
| `messageId` | String? | FK to ChatMessage |
| `promptTokens` | Int | Input tokens |
| `completionTokens` | Int | Output tokens |
| `totalTokens` | Int | Total tokens |
| `model` | String | Model used |
| `costUsd` | Float | Calculated cost |

### AIChatAuditLog
Security audit for AI interactions.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User |
| `conversationId` | String? | FK to ChatConversation |
| `queryHash` | String | SHA-256 of query (privacy) |
| `queryLength` | Int | Query length |
| `functionsCalled` | Json | Functions invoked |
| `dataAccessed` | Json | Data types accessed |
| `tokensUsed` | Int | Tokens used |
| `responseTimeMs` | Int | Response time |
| `ipAddress` | String? | Client IP |
| `userAgent` | String? | Browser/client |
| `flagged` | Boolean | Flagged for review |
| `flagReasons` | String[] | Why flagged |
| `riskScore` | Int | Risk assessment |

---

## 17. WhatsApp Integration

### WhatsAppConfig
Per-tenant WhatsApp Business API credentials.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `phoneNumberId` | String | Meta Phone Number ID |
| `businessAccountId` | String | WhatsApp Business Account ID |
| `accessTokenEncrypted` | String | Encrypted access token |
| `webhookVerifyToken` | String | Webhook verification |
| `isActive` | Boolean | Integration active |

### WhatsAppUserPhone
User phone numbers for WhatsApp.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `userId` | String | FK to User |
| `phoneNumber` | String | Phone (E.164 format) |
| `isVerified` | Boolean | Phone verified |

### WhatsAppActionToken
One-time tokens for approve/reject buttons.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `token` | String | Unique token |
| `entityType` | String | Request type |
| `entityId` | String | Request ID |
| `action` | String | "approve" or "reject" |
| `approverId` | String | Who should act |
| `used` | Boolean | Token used |
| `usedAt` | DateTime? | When used |
| `expiresAt` | DateTime | Token expiry (60 min) |

### WhatsAppMessageLog
Message delivery tracking.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `messageId` | String? | Meta message ID |
| `recipientPhone` | String | Recipient phone |
| `templateName` | String | Template used |
| `status` | String | sent, delivered, read, failed |
| `errorMessage` | String? | Error details |
| `entityType` | String? | Related entity type |
| `entityId` | String? | Related entity ID |
| `configSource` | String? | PLATFORM or CUSTOM |

### PlatformWhatsAppConfig
Platform-wide WhatsApp config (super admin only).

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `phoneNumberId` | String | Meta Phone Number ID |
| `businessAccountId` | String | Business Account ID |
| `accessTokenEncrypted` | String | Encrypted token |
| `webhookVerifyToken` | String | Webhook verification |
| `displayPhoneNumber` | String? | Display number |
| `businessName` | String? | Business name |
| `isActive` | Boolean | Integration active |

---

## 18. System Settings

### AppSetting
Global platform settings (key-value).

| Field | Type | Purpose |
|-------|------|---------|
| `key` | String | Setting key (primary key) |
| `value` | String | Setting value |

### SystemSettings
Per-tenant system settings.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Primary key |
| `tenantId` | String | FK to Organization |
| `key` | String | Setting key |
| `value` | String | Setting value |
| `updatedBy` | String? | Who last updated |

---

## Enums Reference

### Role (User system roles)
- `ADMIN` - Full system access
- `EMPLOYEE` - Basic employee access
- `TEMP_STAFF` - Temporary staff
- `MANAGER` - First-level approver
- `HR_MANAGER` - HR department approver
- `FINANCE_MANAGER` - Finance approver
- `DIRECTOR` - High-value approver

### OrgRole (Organization membership roles)
- `OWNER` - Organization creator, billing access
- `ADMIN` - Manage users and settings
- `MANAGER` - Approve requests, view reports
- `MEMBER` - Basic access

### SubscriptionTier
- `FREE` - Free tier with limits
- `PLUS` - Paid tier with full access

### AssetStatus
- `IN_USE` - Currently assigned/in use
- `SPARE` - Available for assignment
- `REPAIR` - Under repair
- `DISPOSED` - No longer in use

### LeaveStatus
- `PENDING` - Awaiting approval
- `APPROVED` - Approved
- `REJECTED` - Rejected
- `CANCELLED` - Cancelled by requester

### PayrollStatus
- `DRAFT` - Being prepared
- `PENDING_APPROVAL` - Awaiting approval
- `APPROVED` - Approved
- `PROCESSED` - Processed
- `PAID` - Paid
- `CANCELLED` - Cancelled

---

*Generated from prisma/schema.prisma*
