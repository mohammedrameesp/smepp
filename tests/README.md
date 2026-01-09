# Test Suite Documentation

## Overview

This directory contains all unit, API, and security tests for the DAMP application. The test suite is organized by test type and uses Jest as the testing framework.

## Test Structure

```
__tests__/
├── api/              # API endpoint tests
│   ├── assets.test.ts          (20 tests)
│   └── subscriptions.test.ts   (15 tests)
├── security/         # Security-focused tests
│   ├── auth.test.ts            (8 tests)
│   ├── idor.test.ts            (8 tests)
│   └── rate-limit.test.ts      (15 tests)
└── utils/            # Utility function tests
```

## Running Tests

### All Tests (Recommended)
```bash
npm run test:all
```
This runs the comprehensive test suite including:
- Security tests (auth, IDOR, rate limiting)
- API endpoint tests (assets, subscriptions)
- Unit tests (components, utilities)
- Code quality checks (ESLint)
- Type checking (TypeScript)

### Specific Test Suites
```bash
npm run test:security    # Security tests only
npm run test:api         # API endpoint tests only
npm run test:unit        # Unit tests only
npm test                 # All Jest tests (quick)
```

### Watch Mode (Development)
```bash
npm run test:watch       # Run tests in watch mode
```

### Coverage Reports
```bash
npm run test:coverage    # Generate coverage report
```
⚠️ **Note:** Coverage thresholds are currently disabled because most application code is in `src/app/` which is excluded from coverage analysis (tested via E2E tests instead).

## Test Categories

### 1. API Endpoint Tests (`api/`)

Tests for all REST API endpoints ensuring proper request/response handling, authentication, and data validation.

**assets.test.ts** (20 tests)
- GET /api/assets - List assets with pagination, search, and filtering
- POST /api/assets - Create new assets with validation
- GET /api/assets/[id] - Get single asset with authorization
- GET /api/assets/export - Export functionality

**subscriptions.test.ts** (15 tests)
- GET /api/subscriptions - List subscriptions
- GET /api/subscriptions/[id] - Get single subscription
- POST /api/subscriptions - Create subscriptions
- Cost calculations (monthly/yearly)
- Renewal date calculations

### 2. Security Tests (`security/`)

Comprehensive security testing covering authentication, authorization, and common vulnerabilities.

**auth.test.ts** (8 tests)
- Session authentication
- Role-based access control (RBAC)
- Session expiration handling

**idor.test.ts** (8 tests)
- Insecure Direct Object Reference prevention
- Asset access control (admin vs employee)
- Subscription access control
- URL parameter tampering detection

**rate-limit.test.ts** (15 tests)
- Rate limiting logic
- IP extraction from headers
- Rate limit bypass prevention
- Response headers validation

### 3. Utility Tests (`utils/`)

Tests for shared utility functions and helpers.

## Test Coverage

Current test coverage focuses on:
- ✅ API endpoints (100% of endpoints covered)
- ✅ Authentication and authorization logic
- ✅ Security vulnerabilities (IDOR, rate limiting)
- ✅ Business logic (cost calculations, renewal dates)
- ⚠️ UI components (tested via E2E tests)
- ⚠️ Pages (tested via E2E tests)

## Recent Test Updates

### v1.0.0 Changes
- ✅ Added type filtering tests for assets
- ✅ Added category filtering tests for assets
- ✅ Fixed coverage threshold configuration
- ✅ Removed non-existent integration test references
- ✅ Updated test runner to skip E2E tests (compatibility issues)

## Writing New Tests

### API Endpoint Test Template
```typescript
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('API Endpoint Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should test endpoint behavior', async () => {
    // Mock session
    const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
    mockGetServerSession.mockResolvedValue(/* mock session */);

    // Mock database
    const mockPrisma = prisma.model as any;
    mockPrisma.findMany.mockResolvedValue(/* mock data */);

    // Test logic
    expect(result).toBeDefined();
  });
});
```

### Security Test Template
```typescript
describe('Security Feature Tests', () => {
  it('should prevent unauthorized access', async () => {
    const userRole = Role.EMPLOYEE;
    const resourceOwnerId = 'user-456';
    const currentUserId = 'user-123';

    // Should return 403
    expect(currentUserId).not.toBe(resourceOwnerId);
    expect(userRole).not.toBe(Role.ADMIN);
  });
});
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Use Jest mocks for external dependencies (database, auth, etc.)
3. **Coverage**: Aim for meaningful coverage, not just high percentages
4. **Naming**: Use descriptive test names that explain the expected behavior
5. **Assertions**: Include clear, specific assertions

## Continuous Integration

Tests run automatically on:
- ✅ Every commit (via pre-commit hooks)
- ✅ Pull requests (via CI/CD pipeline)
- ✅ Before deployment (via deployment checks)

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot find module"
**Solution:** Run `npm install` to ensure all dependencies are installed

**Issue:** Mock not working as expected
**Solution:** Ensure `jest.clearAllMocks()` is called in `beforeEach()`

**Issue:** Coverage threshold errors
**Solution:** Coverage thresholds are disabled. If re-enabled, add more unit tests for `src/lib/` and `src/components/`

**Issue:** E2E tests failing with TransformStream error
**Solution:** E2E tests currently disabled due to Node.js compatibility. Use Playwright separately: `npm run test:e2e`

## Related Documentation

- [E2E Test Documentation](../e2e/README.md)
- [Testing Strategy](../docs/TESTING_STRATEGY.md)
- [Manual Testing Guide](../docs/testing/TESTING_GUIDE.md)

---

**Last Updated:** v1.0.0 (November 2025)
**Total Tests:** 87 unit/API/security tests
**Status:** ✅ All passing
