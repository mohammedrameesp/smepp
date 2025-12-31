# E2E Test Plan

Comprehensive end-to-end testing plan for Durj platform using Playwright.

**Last Updated**: 2025-12-31

---

## Table of Contents
- [Current Coverage](#current-coverage)
- [Test Environment](#test-environment)
- [Critical User Flows](#critical-user-flows)
- [Module-Specific Tests](#module-specific-tests)
- [Test Execution](#test-execution)
- [Future Enhancements](#future-enhancements)

---

## Current Coverage

### Existing Test Files

| File | Module | Status |
|------|--------|--------|
| `auth.spec.ts` | Authentication | ✅ Implemented |
| `smoke.spec.ts` | Basic health checks | ✅ Implemented |
| `assets.spec.ts` | Asset management | ✅ Implemented |
| `subscriptions.spec.ts` | Subscription tracking | ✅ Implemented |
| `suppliers.spec.ts` | Supplier management | ✅ Implemented |
| `purchase-requests.spec.ts` | Purchase requests | ✅ Implemented |
| `permissions-and-edge-cases.spec.ts` | Edge cases | ✅ Implemented |
| `leave.spec.ts` | Leave management | ✅ Implemented |
| `payroll.spec.ts` | Payroll processing | ✅ Implemented |
| `employees.spec.ts` | Employee management | ✅ Implemented |
| `company-documents.spec.ts` | Document management | ✅ Implemented |
| `settings.spec.ts` | Settings & config | ✅ Implemented |
| `projects.spec.ts` | Project management | ✅ Implemented |
| `reports.spec.ts` | Reports & analytics | ✅ Implemented |

---

## Test Environment

### Prerequisites
```bash
# Install Playwright browsers
npx playwright install

# Start dev server (in separate terminal)
npm run dev
```

### Configuration
- **Base URL**: `http://localhost:3000`
- **Test users**: Created via seed data or test fixtures
- **Parallel execution**: Enabled (configurable)

### Running Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Debug mode
npm run test:e2e:debug
```

---

## Critical User Flows

### 1. Authentication Flow ✅
**File**: `auth.spec.ts`

| Test Case | Priority | Status |
|-----------|----------|--------|
| User can login with credentials | P0 | ✅ |
| User can logout | P0 | ✅ |
| Invalid credentials show error | P0 | ✅ |
| Session persists on refresh | P1 | ✅ |
| Password reset flow | P1 | 📋 Planned |

### 2. Employee Onboarding Flow ✅
**File**: `employees.spec.ts`

| Test Case | Priority | Status |
|-----------|----------|--------|
| New employee completes HR profile | P0 | ✅ |
| Document upload works | P1 | ✅ |
| Profile validation enforced | P1 | ✅ |

### 3. Leave Request Flow ✅
**File**: `leave.spec.ts`

| Test Case | Priority | Status |
|-----------|----------|--------|
| Employee submits leave request | P0 | ✅ |
| Manager approves leave request | P0 | ✅ |
| Leave balance updates correctly | P0 | ✅ |
| Overlapping dates rejected | P1 | ✅ |
| Insufficient balance rejected | P1 | ✅ |

### 4. Asset Assignment Flow ✅
**File**: `assets.spec.ts`

| Test Case | Priority | Status |
|-----------|----------|--------|
| Admin creates asset | P0 | ✅ |
| Admin assigns asset to user | P0 | ✅ |
| Asset history recorded | P1 | ✅ |
| User sees assigned assets | P1 | ✅ |

### 5. Purchase Request Flow ✅
**File**: `purchase-requests.spec.ts`

| Test Case | Priority | Status |
|-----------|----------|--------|
| User creates purchase request | P0 | ✅ |
| Multi-level approval works | P0 | ✅ |
| Status transitions correct | P1 | ✅ |
| Line items calculated correctly | P1 | ✅ |

---

## Module-Specific Tests

### HR Module ✅

#### Employees ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| Create employee record | P0 | `employees.spec.ts` | ✅ |
| Edit employee details | P1 | `employees.spec.ts` | ✅ |
| Upload employee documents | P1 | `employees.spec.ts` | ✅ |
| Document expiry alerts shown | P2 | `employees.spec.ts` | ✅ |

#### Leave ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| View leave balance | P0 | `leave.spec.ts` | ✅ |
| Submit leave request | P0 | `leave.spec.ts` | ✅ |
| Cancel pending request | P1 | `leave.spec.ts` | ✅ |
| Admin configures leave types | P1 | `leave.spec.ts` | ✅ |

#### Payroll ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| Create payroll run | P0 | `payroll.spec.ts` | ✅ |
| Generate payslips | P0 | `payroll.spec.ts` | ✅ |
| Export WPS file | P1 | `payroll.spec.ts` | ✅ |
| Loan deduction applies | P1 | `payroll.spec.ts` | ✅ |

### Operations Module

#### Assets ✅
| Test Case | Priority | File |
|-----------|----------|------|
| CRUD operations | P0 | `assets.spec.ts` ✅ |
| Assignment workflow | P0 | `assets.spec.ts` ✅ |
| Maintenance tracking | P2 | `assets.spec.ts` |
| Depreciation display | P2 | `assets.spec.ts` |

#### Subscriptions ✅
| Test Case | Priority | File |
|-----------|----------|------|
| CRUD operations | P0 | `subscriptions.spec.ts` ✅ |
| Renewal tracking | P1 | `subscriptions.spec.ts` ✅ |
| Cost reporting | P2 | `subscriptions.spec.ts` |

#### Suppliers ✅
| Test Case | Priority | File |
|-----------|----------|------|
| Supplier registration | P0 | `suppliers.spec.ts` ✅ |
| Approval workflow | P0 | `suppliers.spec.ts` ✅ |
| Engagement tracking | P2 | `suppliers.spec.ts` |

### System Module ✅

#### Settings ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| Update company settings | P1 | `settings.spec.ts` | ✅ |
| Configure code formats | P2 | `settings.spec.ts` | ✅ |
| Branding customization | P2 | `settings.spec.ts` | ✅ |
| Approval policies | P1 | `settings.spec.ts` | ✅ |
| Delegations | P2 | `settings.spec.ts` | ✅ |
| Team management | P1 | `settings.spec.ts` | ✅ |

#### Company Documents ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| CRUD operations | P0 | `company-documents.spec.ts` | ✅ |
| Expiry tracking | P1 | `company-documents.spec.ts` | ✅ |
| Document types | P2 | `company-documents.spec.ts` | ✅ |

#### Reports
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| View reports dashboard | P1 | `reports.spec.ts` | ✅ |
| Assets reports (by status, type) | P2 | `reports.spec.ts` | ✅ |
| Subscriptions reports (by status, billing, renewals) | P2 | `reports.spec.ts` | ✅ |
| Suppliers reports (by status, category) | P2 | `reports.spec.ts` | ✅ |
| Purchase requests reports | P2 | `reports.spec.ts` | ✅ |
| Employees & HR reports | P2 | `reports.spec.ts` | ✅ |
| Activity logs & navigation | P2 | `reports.spec.ts` | ✅ |
| Export functionality | P2 | `reports.spec.ts` | ✅ |
| Responsive design tests | P3 | `reports.spec.ts` | ✅ |

### Projects Module ✅

#### Projects ✅
| Test Case | Priority | File | Status |
|-----------|----------|------|--------|
| CRUD operations | P0 | `projects.spec.ts` | ✅ |
| Status management | P1 | `projects.spec.ts` | ✅ |
| Linked purchase requests | P2 | `projects.spec.ts` | ✅ |

---

## Test Data Strategy

### Test Fixtures
```typescript
// tests/e2e/fixtures/test-data.ts
export const testUsers = {
  admin: { email: 'admin@test.com', password: 'Test@123' },
  manager: { email: 'manager@test.com', password: 'Test@123' },
  employee: { email: 'employee@test.com', password: 'Test@123' },
};

export const testOrg = {
  name: 'Test Organization',
  slug: 'test-org',
};
```

### Database Seeding
- Run `npm run db:seed` before E2E tests
- Or use API calls to create test data within tests
- Clean up test data after test runs

---

## Test Execution

### CI/CD Integration

```yaml
# .github/workflows/test.yml
e2e-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run build
    - run: npm run test:e2e
```

### Scheduling
- **PR checks**: Run smoke tests on every PR
- **Nightly**: Run full E2E suite
- **Release**: Run all tests before deployment

---

## Future Enhancements

### Priority 1 - Critical Flows
- [x] Leave request and approval flow ✅
- [x] Payroll run creation flow ✅
- [x] Employee onboarding flow ✅

### Priority 2 - Module Coverage
- [x] Company document management ✅
- [x] Approval policy configuration ✅
- [ ] Multi-tenant isolation tests

### Priority 3 - Edge Cases
- [ ] Concurrent user actions
- [ ] Large data set handling
- [ ] Mobile responsive testing

### Visual Regression Testing
Consider adding visual regression with Playwright:
```typescript
await expect(page).toHaveScreenshot('dashboard.png');
```

---

## Test Writing Guidelines

### Best Practices
1. **Isolate tests** - Each test should be independent
2. **Use page objects** - Abstract UI interactions
3. **Meaningful assertions** - Test user-visible outcomes
4. **Cleanup after tests** - Don't leave test data behind

### Example Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Leave Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to leave page
    await page.goto('/admin/leave/requests');
  });

  test('employee can submit leave request', async ({ page }) => {
    await page.click('[data-testid="new-request-btn"]');
    await page.fill('[name="startDate"]', '2025-01-15');
    await page.fill('[name="endDate"]', '2025-01-17');
    await page.selectOption('[name="leaveType"]', 'annual');
    await page.click('[type="submit"]');

    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## Metrics & Reporting

### Coverage Goals
| Module | Current | Target |
|--------|---------|--------|
| Authentication | 80% | 90% |
| Assets | 70% | 85% |
| Subscriptions | 60% | 80% |
| Suppliers | 60% | 80% |
| Leave | 75% | 80% |
| Payroll | 70% | 80% |
| Employees | 70% | 85% |
| Company Documents | 70% | 80% |
| Settings | 80% | 90% |
| Projects | 60% | 75% |
| Reports | 80% | 90% |

### Reporting
- Playwright HTML report generated after each run
- Screenshots captured on failures
- Video recording for debugging
