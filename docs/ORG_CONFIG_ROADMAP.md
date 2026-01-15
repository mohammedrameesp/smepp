# Roadmap: Organization-Specific Configuration

## Summary

**Total Items:** 21 configuration opportunities identified
**Status:** Planning/Backlog
**Last Updated:** January 2026

### Quick Stats
| Category | Count | Priority |
|----------|-------|----------|
| Regional/Locale | 3 | High |
| HR Compliance | 5 | High |
| Financial/Localization | 4 | Medium |
| Operations | 3 | Medium |
| Security/Admin | 4 | Low |
| System | 2 | Low |

---

## Overview

Analysis of hardcoded values and business rules in the codebase that should be configurable per organization. Prioritized by impact and implementation complexity.

---

## HIGH PRIORITY - Regional/Compliance Settings

### 1. Timezone Configuration
**Currently:** Hardcoded `Asia/Qatar` (UTC+3) in 40+ files
**Location:** `src/lib/core/datetime/constants.ts`, schema default
**Impact:** All date/time displays, leave calculations, reports

**Implementation:**
- Add `timezone` to Organization settings UI (dropdown with common timezones)
- Schema already has field: `timezone String @default("Asia/Qatar")`
- Update datetime utilities to use org timezone instead of hardcoded constant

**Files to modify:** ~15 files in `src/lib/core/datetime/`, leave components, email templates

---

### 2. Primary/Base Currency
**Currently:** QAR hardcoded as base currency
**Location:** `src/lib/core/currency.ts`, throughout codebase
**Impact:** All financial displays, asset values, payroll, purchase requests

**Implementation:**
- Add `baseCurrency` field to Organization model
- Update currency formatting to use org base currency
- Exchange rates already support multiple currencies

**Files to modify:** `currency.ts`, asset components, payroll, purchase requests (~30 files)

---

### 3. Date/Number Format Locale
**Currently:** `en-GB` for dates, `en-US`/`en-QA` for numbers (hardcoded)
**Location:** 50+ files with `toLocaleDateString('en-GB')`
**Impact:** All date displays, currency formatting, reports

**Implementation:**
- Add `dateFormat` enum: `DMY` (DD/MM/YYYY), `MDY` (MM/DD/YYYY), `YMD` (YYYY-MM-DD)
- Add `numberLocale` to Organization settings
- Create centralized formatting utilities that read org settings

**Files to modify:** Create wrapper utilities, update all date/number formatting calls

---

### 4. Gratuity/End-of-Service Rules
**Currently:** Qatar Labor Law hardcoded
- `MIN_GRATUITY_SERVICE_MONTHS = 12`
- `GRATUITY_WEEKS_PER_YEAR = 3`
- `DAYS_PER_MONTH = 30`

**Location:** `src/lib/constants/limits.ts`, `src/features/payroll/lib/gratuity.ts`
**Impact:** End-of-service benefit calculations

**Implementation:**
- Add `gratuitySettings` JSON field to Organization:
  ```typescript
  {
    minServiceMonths: 12,
    weeksPerYear: 3,
    daysPerMonth: 30
  }
  ```
- Update gratuity calculation to use org settings

---

### 5. Annual Leave Entitlement Tiers
**Currently:** Hardcoded 21 days (<5 years), 28 days (5+ years)
**Location:** `src/features/leave/lib/leave-balance-init.ts`, `leave-utils.ts`
**Impact:** Leave balance initialization, entitlement display

**Implementation:**
- Add `annualLeaveEntitlements` JSON field:
  ```typescript
  { "0": 21, "60": 28 }  // serviceMonths: days
  ```
- Or make this per-LeaveType configuration (more flexible)

---

### 6. Sick Leave Pay Tiers
**Currently:** Hardcoded Qatar tiers (14 days 100%, 28 days 50%, 42 days 0%)
**Location:** `src/features/leave/lib/leave-utils.ts` lines 135-139
**Impact:** Sick leave balance display, pay calculations

**Implementation:**
- Already supported in LeaveType model via `payTiers` JSON field
- Need to ensure UI allows editing these tiers per leave type
- Default seeding should be configurable

---

### 7. Asset Depreciation Rates
**Currently:** Qatar Tax Authority rates hardcoded
**Location:** `src/features/assets/lib/depreciation/constants.ts`
**Impact:** Asset value calculations, financial reports

**Implementation:**
- Already has `DepreciationCategory` model per tenant
- Need UI to customize default rates when seeding
- Consider adding "country preset" selector (Qatar, UAE, US MACRS, etc.)

---

## MEDIUM PRIORITY - Business Rules

### 8. Phone Number Format/Country Code
**Currently:** Qatar (+974, 8 digits) hardcoded in phone input
**Location:** `src/components/domains/hr/profile/phone-input.tsx`
**Impact:** Employee phone validation

**Implementation:**
- Add `defaultCountryCode` to Organization settings
- Update phone input to use org default
- Add country-specific validation rules

---

### 9. Working Days Per Week
**Currently:** `QATAR_WORKDAYS_PER_WEEK = 5` hardcoded
**Location:** `src/lib/constants/limits.ts`
**Impact:** Salary calculations, leave pro-rating

**Implementation:**
- Derive from `weekendDays` array length (7 - weekendDays.length)
- Or add explicit `workingDaysPerWeek` field

---

### 10. Bank List for Payroll
**Currently:** 11 Qatar banks hardcoded
**Location:** `src/lib/data/constants.ts` lines 331-344
**Impact:** Employee bank account setup

**Implementation:**
- Add `PayrollBank` model per tenant
- Seed with country-specific defaults
- Allow admins to add custom banks

---

### 11. Fiscal Year Settings
**Currently:** Calendar year assumed (Jan-Dec)
**Location:** Various leave balance, payroll calculations
**Impact:** Annual entitlements, reports

**Implementation:**
- Add `fiscalYearStart` (month 1-12) to Organization
- Update year-based calculations to use fiscal year

---

### 12. Probation Period
**Currently:** Not configurable (some leave types check service months)
**Impact:** Leave eligibility, benefits

**Implementation:**
- Add `defaultProbationMonths` to Organization
- Use in leave type minimum service requirements
- Display in employee onboarding

---

## ADDITIONAL SUGGESTIONS - Not Currently in Codebase

### 13. Public Holidays Calendar
**Currently:** Not implemented
**Impact:** Leave calculations, calendar display

**Implementation:**
- Add `PublicHoliday` model per tenant (date, name, isOptional)
- Update leave day calculations to optionally exclude holidays
- Show holidays on leave calendar
- Seed with country-specific defaults

---

### 14. Working Hours
**Currently:** Not tracked
**Impact:** Time-based features, attendance

**Implementation:**
- Add `workingHoursStart` and `workingHoursEnd` to Organization
- Use for future attendance/time tracking features
- Display in employee handbook/portal

---

### 15. Notification Channel Preferences
**Currently:** Notifications sent via all available channels
**Impact:** User experience, communication

**Implementation:**
- Add `notificationChannels` JSON field: `{ email: true, whatsapp: true, inApp: true }`
- Allow org admins to disable specific channels
- Per-notification-type preferences

---

### 16. Password/Security Policy
**Currently:** No org-level password policy
**Impact:** Security compliance

**Implementation:**
- Add `securityPolicy` JSON field:
  ```typescript
  {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    sessionTimeoutMinutes: 1440,
    mfaRequired: false
  }
  ```

---

### 17. Auto-Approval Thresholds
**Currently:** All requests require manual approval
**Impact:** Admin workload, efficiency

**Implementation:**
- Add to approval policies: auto-approve if amount < X or days < Y
- E.g., auto-approve leave requests under 2 days
- E.g., auto-approve purchase requests under 500 QAR

---

### 18. Document Templates
**Currently:** No custom templates
**Impact:** HR processes, branding

**Implementation:**
- Add `DocumentTemplate` model per tenant
- Templates for: offer letters, contracts, warning letters, exit letters
- Placeholder system for employee/company data

---

## LOW PRIORITY - System Settings

### 19. Session Duration
**Currently:** `SESSION_MAX_AGE_SECONDS = 86400` (24 hours)
**Location:** `src/lib/constants/limits.ts`
**Impact:** Security, user experience

### 20. File Upload Limits
**Currently:** Various limits hardcoded (2MB logo, 5MB docs, 10MB files)
**Location:** `src/lib/constants/limits.ts`
**Impact:** Storage usage, user uploads

### 21. Data Retention Period
**Currently:** Soft-deleted records kept indefinitely
**Impact:** Storage, compliance (GDPR)

**Implementation:**
- Add `dataRetentionDays` to Organization
- Background job to purge old soft-deleted records

---

## Already Configurable (No Changes Needed)

- Weekend days (January 2026)
- Enabled modules
- Brand colors
- Code prefix and formats
- Additional currencies
- Multiple locations toggle
- Leave types (can be customized after seeding)
- Approval policies
- WhatsApp integration

---

## Recommended Implementation Order

### Phase 1: Regional Settings (Quick Wins)
1. **Timezone** - Schema field exists, just add UI dropdown
2. **Date Format** - Add field + centralized formatting helper
3. **Working Days** - Derive from existing weekendDays

### Phase 2: HR Compliance
4. **Annual Leave Tiers** - Make service-based entitlement configurable per leave type
5. **Gratuity Rules** - Add settings JSON field
6. **Probation Period** - Add field
7. **Public Holidays** - New model + calendar integration

### Phase 3: Financial/Localization
8. **Base Currency** - Add field + update displays
9. **Phone Country Code** - Add default country
10. **Number Format Locale** - Add locale setting
11. **Bank List** - Add PayrollBank model

### Phase 4: Operations
12. **Fiscal Year** - Add fiscal year start month
13. **Auto-Approval Thresholds** - Extend approval policies
14. **Working Hours** - Add time fields

### Phase 5: Advanced Features
15. **Document Templates** - New model + template editor
16. **Notification Preferences** - Channel toggles per org
17. **Security Policy** - Password/session rules
18. **Data Retention** - Compliance configuration

---

## Implementation Checklist

| # | Setting | Status | Phase |
|---|---------|--------|-------|
| 1 | Timezone | Not Started | 1 |
| 2 | Date Format | Not Started | 1 |
| 3 | Working Days | Not Started | 1 |
| 4 | Annual Leave Tiers | Not Started | 2 |
| 5 | Gratuity Rules | Not Started | 2 |
| 6 | Probation Period | Not Started | 2 |
| 7 | Public Holidays | Not Started | 2 |
| 8 | Base Currency | Not Started | 3 |
| 9 | Phone Country Code | Not Started | 3 |
| 10 | Number Format Locale | Not Started | 3 |
| 11 | Bank List | Not Started | 3 |
| 12 | Fiscal Year | Not Started | 4 |
| 13 | Auto-Approval | Not Started | 4 |
| 14 | Working Hours | Not Started | 4 |
| 15 | Document Templates | Not Started | 5 |
| 16 | Notification Prefs | Not Started | 5 |
| 17 | Security Policy | Not Started | 5 |
| 18 | Data Retention | Not Started | 5 |
| 19 | Session Duration | Not Started | - |
| 20 | File Upload Limits | Not Started | - |
| 21 | Depreciation Presets | Not Started | - |

**Already Implemented:**
- ✅ Weekend Days (January 2026)
- ✅ Enabled Modules
- ✅ Brand Colors
- ✅ Code Prefix & Formats
- ✅ Additional Currencies
- ✅ Multiple Locations
- ✅ Leave Types (customizable)
- ✅ Approval Policies
- ✅ WhatsApp Integration

---

## Verification

For each setting implemented:
1. Add UI in Organization Settings (appropriate tab)
2. Update API GET/PATCH to handle field
3. Update business logic to read org setting instead of hardcoded value
4. Verify existing orgs default correctly (backwards compatible)
5. Test new org creation with different setting values
