# E2E Tests

This directory contains End-to-End (E2E) tests using Playwright for the DAMP Asset Management application.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI mode (recommended for development)
npm run test:e2e:ui

# Watch tests run in browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Test Files

- **auth.spec.ts** - Authentication & role-based access (5 tests)
- **assets.spec.ts** - Asset CRUD workflow (5 tests)
- **subscriptions.spec.ts** - Subscription workflow (4 tests)
- **accreditation.spec.ts** - Accreditation system (5 tests)
- **permissions-and-edge-cases.spec.ts** - Security & validation (8 tests)

## Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateAssetData } from './utils/test-data';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/admin/assets');
    await page.click('text=New Asset');
    await expect(page).toHaveURL(/\/new/);
  });
});
```

## Utilities

### Authentication
```typescript
import { loginAs, TEST_USERS } from './utils/auth';

// Login as different roles
await loginAs(page, TEST_USERS.admin);
await loginAs(page, TEST_USERS.employee);
await loginAs(page, TEST_USERS.validator);
```

### Test Data
```typescript
import { generateAssetData, generateSubscriptionData } from './utils/test-data';

const asset = generateAssetData();
// { model: 'TEST Laptop 1699564800000', assetTag: 'TEST-1699564800000', ... }

const subscription = generateSubscriptionData();
// { serviceName: 'TEST Subscription 1699564800000', costPerCycle: '100', ... }
```

## Writing New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import test utilities from `./utils/`
3. Use `test.describe()` to group related tests
4. Use `test.beforeEach()` for setup (authentication, navigation)
5. Write tests with clear assertions

## Best Practices

- ✅ Use test data generators for unique data
- ✅ Use flexible selectors (text, name, id)
- ✅ Add meaningful test descriptions
- ✅ Wait for network idle when needed
- ✅ Assert expected behavior explicitly
- ❌ Don't hardcode user IDs or data
- ❌ Don't rely on test execution order
- ❌ Don't skip cleanup/setup

## Debugging

```bash
# Run specific test file
npx playwright test auth.spec.ts

# Run specific test by name
npx playwright test -g "should login as admin"

# Debug mode with inspector
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## CI/CD

Tests automatically start the dev server and run in headless mode. No additional setup needed.

## Documentation

See [docs/E2E_TESTING_GUIDE.md](../docs/E2E_TESTING_GUIDE.md) for complete documentation.

## Test Coverage

- ✅ 27 E2E tests
- ✅ 100% of manual test scenarios automated
- ✅ All user workflows covered
- ✅ Security boundaries tested
- ✅ Edge cases validated
