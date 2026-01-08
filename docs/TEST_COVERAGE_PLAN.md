# Test Coverage Review & Improvement Plan

## Executive Summary

**Current Test Status:** 63 test files with ~2,033 test cases covering approximately **33% of the codebase**.

**Key Findings:**
- ✅ **Strong areas:** Core business logic (payroll, gratuity), validation layer, basic security (IDOR, RBAC)
- ⚠️ **Moderate areas:** API endpoints (40% coverage), feature utilities (35%)
- ❌ **Critical gaps:** Super-admin system (0%), security modules (14%), React components (0%)

**Bottom Line:** The codebase has solid foundations for critical business logic but needs significant coverage expansion for API endpoints, security features, and multi-tenant enforcement.

---

## Current Test Structure

### Test Organization (63 files, ~2,033 specs)

```
tests/
├── unit/           # 24 files (~1,200 specs) - Business logic, utilities, validation
├── integration/    # 23 files (~300 specs) - API endpoint testing
├── security/       # 3 files (~150 specs) - Auth, IDOR, rate limiting
└── e2e/            # 13 files (~400 specs) - Full user journeys
```

### Test Frameworks

**Jest Configuration:**
- Setup: `jest.config.ts`, `jest.setup.ts`
- Environment: jsdom with global Prisma/NextAuth mocks
- Coverage thresholds:
  - Global: 5% branches, 25% functions, 8% lines (very low)
  - Payroll: 40% branches, 45% functions, 50% lines
  - Leave: 30% branches, 40% functions, 40% lines
- Pattern: `tests/**/*.(test|spec).[jt]s?(x)`

**Playwright Configuration:**
- Browser: Chromium only
- Base URL: localhost:3000
- Auto-starts dev server
- Screenshots/videos on failure

---

## Coverage Analysis by Category

### 1. ✅ **Well-Tested Areas** (Strong Coverage)

#### Core Business Logic
- **Payroll calculations** (`gratuity.test.ts`, `leave-deduction.test.ts`, `preview.test.ts`, `wps.test.ts`)
  - End of Service Benefits (EOSB) calculations
  - Leave deduction formulas
  - Payroll previews
  - WPS integration basics

- **Utilities** (25+ test files)
  - CSV import/export (`csv-utils.test.ts`)
  - Date formatting (`date-format.test.ts`)
  - Qatar timezone handling (`qatar-timezone.test.ts`)
  - Subscription renewal dates (`renewal-date.test.ts`)

- **Validation Layer** (8 test files)
  - All major Zod schemas tested
  - Assets, subscriptions, employees, leave, purchase requests
  - Both valid and invalid input scenarios

#### HTTP Layer
- **API Handler** (`handler.test.ts`, `errors.test.ts`)
  - Auth checks, admin role verification
  - Rate limiting integration
  - Error formatting and response codes

#### Multi-Tenant Core (Basic)
- **Tenant Context** (`prisma-tenant.test.ts`)
  - Header parsing (x-tenant-id, x-tenant-slug)
  - Tenant context creation
  - Basic isolation validation

#### Security Basics
- **IDOR Prevention** (`idor.test.ts`) - Cross-tenant access blocking
- **RBAC** (`auth.test.ts`) - Role-based access control
- **Rate Limiting** (`rate-limit.test.ts`) - Token bucket algorithm

#### E2E Coverage (13 feature areas)
- Authentication, assets, employees, leave, payroll, subscriptions, suppliers
- Purchase requests, company documents, settings, reports
- Permissions and edge cases

---

### 2. ⚠️ **Partially Tested Areas** (Moderate Coverage)

#### API Endpoints: 80/201 tested (40%)
**Tested:**
- Assets (6 routes), Employees (7 routes), Leave (5 routes)
- Subscriptions (5 routes), Suppliers (5 routes), Users (4 routes)
- Purchase Requests (4 routes)

**Missing:** 121 routes including:
- All super-admin routes (25+ endpoints)
- All admin utility routes (13 endpoints)
- OAuth callbacks (4 routes)
- Asset sub-routes (maintenance, depreciation, utilization, history, import)
- Leave approvals (approve, reject, only in E2E)
- Subscription lifecycle (cancel, reactivate, periods, import)
- Payroll loans (4 routes)
- Delegations (2 routes)
- Notifications (3 routes)
- Approval workflows (6 routes)
- Asset requests (5 routes)
- WhatsApp integration (3 routes)

#### Feature Libraries: 8/23 tested (35%)
**Tested:**
- Some payroll utils, purchase request utils, subscription lifecycle

**Missing:**
- Asset export/import/update/utils
- Leave request validation, seeding
- Employee HR utilities
- Purchase request creation workflow
- Approval engine workflows
- Company document utils
- Notification dispatch

---

### 3. ❌ **Critical Coverage Gaps** (High Risk)

#### A. Super-Admin System (0% coverage)
**Impact:** Platform integrity, organization management
**Missing Tests:**
- `/api/super-admin/organizations/*` - Org CRUD, settings, module toggles
- `/api/super-admin/users/*` - User management, role assignments
- `/api/super-admin/impersonation/*` - JWT-based tenant impersonation
- `/api/super-admin/backups/*` - Backup creation, restoration, encryption
- `/api/super-admin/analytics/*` - Platform-wide analytics

#### B. Security Modules (14% coverage)
**Impact:** Data security, access control
**Missing Tests:**
- Account lockout (`account-lockout.ts`) - Brute force protection
- Backup encryption (`backup-encryption.ts`) - Data at rest
- CSRF protection (`csrf.ts`) - Cross-site request forgery
- Security headers (`headers.ts`) - XSS, clickjacking prevention
- Password validation (`password-validation.ts`) - Password strength
- Impersonation logic (`impersonation.ts`) - Admin access delegation

#### C. Multi-Tenant Security (20% coverage)
**Impact:** Tenant isolation, feature access control
**Missing Tests:**
- Feature flags (`feature-flags.ts`) - Module access enforcement
- Usage limits (`limits.ts`) - Subscription tier limits
- Subdomain routing (`subdomain.ts`) - Tenant resolution
- Prisma extension query filtering (only header parsing tested)

#### D. Core Utilities (40% coverage)
**Impact:** System functionality, data integrity
**Missing Tests:**
- Email system (`email.ts`, `email-templates.ts`)
- File uploads (`upload.ts`)
- Storage layer (`storage/`, `files/`)
- Caching (`cache.ts`)
- Activity logging (`activity.ts`)
- Currency conversion (`currency.ts`)
- Branding (`branding.ts`)
- Export/import utilities (`export-utils.ts`, `import-utils.ts`)
- Request deduplication (`request-dedup.ts`)

#### E. React Components (0% coverage)
**Impact:** UI logic bugs, prop validation
**Missing:**
- All components in `src/components/` (~50+ files)
- Feature-specific components (`src/features/*/components/`)
- Only E2E tests verify rendering, not component logic

#### F. Advanced Features (0% coverage)
**Impact:** Feature reliability
**Missing Tests:**
- AI chat functionality (`src/lib/ai/`)
- WhatsApp integration (`src/lib/whatsapp/`)
- Two-factor authentication (`src/lib/two-factor/`)
- Access control system (`src/lib/access-control/`)
- Module registry (`src/lib/modules/`)

---

## Test Quality Issues

### Problems Found

1. **Mock/Reality Mismatch**
   - Jest setup mocks Prisma globally but doesn't replicate tenant auto-filtering
   - OAuth utils tested but callback routes untested
   - NextAuth config mocked but provider flows untested

2. **Low Global Coverage Thresholds**
   - 5% branches, 25% functions, 8% lines
   - Too permissive - doesn't enforce quality
   - Only payroll/leave have decent thresholds

3. **Integration Tests Incomplete**
   - Only test happy paths for CRUD
   - Missing error scenarios (409 conflicts, 422 validation, 500 errors)
   - No concurrent request testing
   - No transaction rollback testing

4. **E2E Tests Gaps**
   - Only Chromium tested (no Firefox, Safari)
   - No mobile viewport testing
   - Missing cross-browser compatibility

5. **No Performance Tests**
   - No load testing
   - No database query optimization tests
   - No API response time assertions

6. **Edge Cases Missing**
   - Race conditions (concurrent updates)
   - Network failures/retries
   - Database connection failures
   - File upload failures
   - Email sending failures

---

## Recommended Test Improvements

### Priority 1: Critical Security & Business Logic (High Risk)

| Area | Files to Test | Reason | Effort |
|------|---------------|--------|--------|
| **Super-admin system** | 25+ API routes | Platform integrity | High |
| **Account lockout** | `account-lockout.ts` | Brute force protection | Low |
| **Tenant isolation** | Prisma extension, feature flags, limits | Multi-tenancy core | Medium |
| **Asset import/export** | `asset-import.ts`, `asset-export.ts` | Data integrity | Medium |
| **Subscription lifecycle** | Cancel, reactivate, periods | Billing accuracy | Medium |
| **Leave approvals** | Approve/reject routes | HR compliance | Low |
| **Payroll processing** | Payroll run creation, finalization | Financial accuracy | Medium |
| **Impersonation security** | `impersonation.ts` + routes | Admin access control | Medium |

### Priority 2: Common Operations (Medium Risk)

| Area | Files to Test | Reason | Effort |
|------|---------------|--------|--------|
| **Asset maintenance** | Maintenance CRUD routes | Asset tracking | Low |
| **WhatsApp notifications** | WhatsApp integration + routes | User communication | Medium |
| **Two-factor auth** | 2FA library + routes | Account security | Medium |
| **Delegation workflows** | Delegation routes | Permission management | Low |
| **Document expiry alerts** | Document utility + routes | Compliance tracking | Low |
| **Purchase request approvals** | Approval engine workflows | Procurement process | Medium |
| **File uploads** | `upload.ts`, storage layer | Data handling | Medium |
| **Email system** | `email.ts`, `email-templates.ts` | User communication | Low |

### Priority 3: Quality Improvements (Lower Risk)

| Area | Files to Test | Reason | Effort |
|------|---------------|--------|--------|
| **React components** | Component unit tests | UI logic bugs | High |
| **AI chat** | AI integration | Feature reliability | Low |
| **Currency conversion** | `currency.ts` | Financial accuracy | Low |
| **Integration error scenarios** | All API routes | Error handling | Medium |
| **Performance tests** | Load testing | Scalability | High |
| **Cross-browser E2E** | Firefox, Safari tests | Compatibility | Medium |
| **Caching layer** | `cache.ts` | Performance | Low |

---

## Improvement Roadmap

### Phase 1: Security & Isolation (Weeks 1-2)

**Goal:** Ensure multi-tenant security and admin access control

1. **Super-admin route testing**
   - Create `tests/integration/super-admin/` directory
   - Test organization CRUD, user management, impersonation
   - Test backup creation/restoration
   - **Files:** 5 new test files, ~150 specs

2. **Security module testing**
   - Test account lockout logic
   - Test CSRF protection
   - Test security headers
   - Test password validation
   - Test impersonation JWT creation/validation
   - **Files:** 5 new test files, ~100 specs

3. **Multi-tenant enforcement**
   - Test feature flag access control
   - Test usage limit enforcement
   - Test subdomain routing
   - Integration tests with real Prisma (not mocked)
   - **Files:** 3 new test files, ~80 specs

**Deliverables:** 13 new test files, ~330 specs, critical security verified

### Phase 2: Business Logic (Weeks 3-4)

**Goal:** Complete coverage for financial and HR operations

1. **Asset management**
   - Test import/export CSV/Excel
   - Test maintenance records
   - Test depreciation tracking
   - Test utilization monitoring
   - **Files:** 4 new test files, ~100 specs

2. **Subscription lifecycle**
   - Test cancellation workflow
   - Test reactivation logic
   - Test period tracking
   - Test import functionality
   - **Files:** 4 new test files, ~80 specs

3. **Leave & approvals**
   - Test approval/rejection routes
   - Test approval engine workflows
   - Test leave balance calculations edge cases
   - **Files:** 3 new test files, ~60 specs

4. **Payroll edge cases**
   - Test payroll run creation with errors
   - Test loan deduction integration
   - Test WPS file generation edge cases
   - **Files:** 2 new test files, ~50 specs

**Deliverables:** 13 new test files, ~290 specs, business operations verified

### Phase 3: Infrastructure & Features (Weeks 5-6)

**Goal:** Complete infrastructure and integration testing

1. **Core utilities**
   - Test email system and templates
   - Test file upload and storage
   - Test caching layer
   - Test activity logging
   - Test currency conversion
   - **Files:** 5 new test files, ~100 specs

2. **Integration features**
   - Test WhatsApp integration
   - Test AI chat functionality
   - Test two-factor authentication
   - **Files:** 3 new test files, ~60 specs

3. **Delegation & notifications**
   - Test delegation routes
   - Test notification dispatch
   - Test document expiry alerts
   - **Files:** 3 new test files, ~60 specs

**Deliverables:** 11 new test files, ~220 specs, infrastructure verified

### Phase 4: Quality & Coverage (Weeks 7-8)

**Goal:** Achieve comprehensive quality coverage

1. **API endpoint completion**
   - Test all remaining untested routes
   - Add error scenario testing to existing tests
   - Add concurrent request testing
   - **Updates:** 20+ existing test files, ~200 new specs

2. **React component testing**
   - Set up React Testing Library
   - Test critical components (forms, tables, modals)
   - Test feature-specific components
   - **Files:** 15-20 new test files, ~150 specs

3. **Coverage threshold updates**
   - Increase global thresholds to 60/70/70
   - Add per-module thresholds for critical areas
   - Fix failing coverage
   - **Updates:** `jest.config.ts`

4. **Cross-browser E2E**
   - Add Firefox and Safari to Playwright config
   - Run existing E2E tests on all browsers
   - Add mobile viewport tests
   - **Updates:** `playwright.config.ts`, run existing tests

**Deliverables:** Enhanced quality, 80%+ coverage target

---

## Coverage Goals

### Target Coverage After Implementation

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| API Routes | 40% | 90% | +50% |
| Feature Libraries | 35% | 80% | +45% |
| Security Modules | 14% | 100% | +86% |
| Core Utilities | 40% | 85% | +45% |
| React Components | 0% | 60% | +60% |
| **Overall Coverage** | **33%** | **80%** | **+47%** |

### Updated Jest Thresholds

```javascript
// jest.config.ts
coverageThreshold: {
  global: {
    branches: 60,
    functions: 70,
    lines: 70,
    statements: 70
  },
  './src/lib/domains/payroll/**': {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/lib/domains/leave/**': {
    branches: 65,
    functions: 75,
    lines: 75,
    statements: 75
  },
  './src/lib/multi-tenant/**': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95
  },
  './src/lib/security/**': {
    branches: 95,
    functions: 100,
    lines: 100,
    statements: 100
  }
}
```

---

## Testing Best Practices to Follow

### 1. Test Structure
- **AAA Pattern:** Arrange, Act, Assert
- **One assertion concept per test**
- **Descriptive test names:** `it('should reject cross-tenant asset access')`

### 2. Test Data
- Use factories for consistent test data (`tests/helpers/factories.ts`)
- Create tenant-specific test data with predictable IDs
- Clean up test data after each test

### 3. Mocking Strategy
- Mock external services (Stripe, Supabase, email)
- Use real Prisma for integration tests (test DB)
- Mock NextAuth only when necessary
- Don't over-mock - test real code paths

### 4. Integration Test Pattern
```typescript
describe('POST /api/assets', () => {
  it('should create asset with tenant isolation', async () => {
    // Arrange
    const session = mockSession({ tenantId: 'tenant-1' });
    const assetData = { name: 'Laptop', type: 'HARDWARE' };

    // Act
    const response = await POST(
      new NextRequest(/* ... */),
      { params: {} }
    );

    // Assert
    expect(response.status).toBe(201);
    const asset = await response.json();
    expect(asset.tenantId).toBe('tenant-1');
  });

  it('should reject invalid data', async () => { /* ... */ });
  it('should enforce usage limits', async () => { /* ... */ });
  it('should require authentication', async () => { /* ... */ });
});
```

### 5. E2E Test Pattern
```typescript
test('asset lifecycle - create, assign, dispose', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@test.com');
  await page.click('button[type=submit]');

  // Create
  await page.goto('/admin/assets');
  await page.click('text=Add Asset');
  // ... test flow

  // Verify
  await expect(page.locator('text=Asset created')).toBeVisible();
});
```

---

## Verification Steps

After implementing test improvements:

### 1. Coverage Report
```bash
npm run test:unit -- --coverage
npm run test:security -- --coverage
npm run test:integration -- --coverage
```

**Expected:** Coverage reports showing 80%+ overall coverage

### 2. All Tests Pass
```bash
npm test                # All unit/integration/security tests
npm run test:e2e        # All E2E tests
```

**Expected:** All tests pass with no failures

### 3. Coverage Thresholds Met
```bash
npm run test:unit       # Should pass with new thresholds
```

**Expected:** No coverage threshold failures

### 4. CI/CD Integration
- Ensure tests run on every PR
- Block merges if tests fail
- Block merges if coverage drops
- Generate coverage reports in CI

### 5. Test Performance
```bash
time npm test
time npm run test:e2e
```

**Expected:**
- Unit/integration tests: < 2 minutes
- E2E tests: < 5 minutes

---

## Files to Create/Update

### New Test Files Needed (50+ files)

**Integration Tests (25+ files):**
- `tests/integration/super-admin/organizations.test.ts`
- `tests/integration/super-admin/users.test.ts`
- `tests/integration/super-admin/impersonation.test.ts`
- `tests/integration/super-admin/backups.test.ts`
- `tests/integration/assets/maintenance.test.ts`
- `tests/integration/assets/depreciation.test.ts`
- `tests/integration/assets/import.test.ts`
- `tests/integration/subscriptions/lifecycle.test.ts`
- `tests/integration/leave/approvals.test.ts`
- `tests/integration/payroll/loans.test.ts`
- `tests/integration/delegations/delegations.test.ts`
- `tests/integration/notifications/notifications.test.ts`
- `tests/integration/approvals/workflows.test.ts`
- `tests/integration/whatsapp/whatsapp.test.ts`
- And 10+ more...

**Unit Tests (15+ files):**
- `tests/unit/security/account-lockout.test.ts`
- `tests/unit/security/csrf.test.ts`
- `tests/unit/security/headers.test.ts`
- `tests/unit/security/password-validation.test.ts`
- `tests/unit/security/impersonation.test.ts`
- `tests/unit/multi-tenant/feature-flags.test.ts`
- `tests/unit/multi-tenant/limits.test.ts`
- `tests/unit/multi-tenant/subdomain.test.ts`
- `tests/unit/core/email.test.ts`
- `tests/unit/core/upload.test.ts`
- `tests/unit/core/cache.test.ts`
- `tests/unit/features/assets/asset-import.test.ts`
- `tests/unit/features/assets/asset-export.test.ts`
- And 5+ more...

**Component Tests (15-20 files):**
- `tests/unit/components/asset-form.test.tsx`
- `tests/unit/components/employee-form.test.tsx`
- `tests/unit/components/data-table.test.tsx`
- And 12+ more...

### Configuration Updates

**`jest.config.ts`:**
- Update coverage thresholds
- Add per-module thresholds

**`playwright.config.ts`:**
- Add Firefox and Safari browsers
- Add mobile viewport projects

**`package.json`:**
- Ensure test commands are correct
- Add new test scripts if needed

---

## Summary

**Current State:** 63 test files, 2,033 specs, ~33% coverage
**Target State:** 113+ test files, 3,500+ specs, ~80% coverage
**Effort:** ~8 weeks for 4 phases
**Impact:** Critical security vulnerabilities identified and tested, business logic fully verified, infrastructure tested

**Next Steps:**
1. Review this plan with team
2. Prioritize which phases to tackle first
3. Assign test writing to team members
4. Set up coverage tracking in CI/CD
5. Begin with Phase 1 (Security & Isolation)
