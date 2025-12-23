# Testing Strategy for Asset Management System

## Project Stack
- **Framework**: Next.js 15.5.5
- **Language**: TypeScript 5
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6.18.0
- **Authentication**: NextAuth 4.24.11
- **UI**: React 19.1.0

---

## 🧪 Testing Pyramid

```
        /\
       /  \      E2E Tests (Few)
      /----\     - Critical user flows
     /      \    - Authentication flows
    /--------\
   /          \  Integration Tests (Some)
  /------------\ - API routes with DB
 /______________\ Unit Tests (Many)
                  - Utilities
                  - Pure functions
                  - Business logic
```

---

## 1️⃣ TESTING ENVIRONMENT SETUP

### Testing Stack
- **Test Runner**: Jest 29
- **React Testing**: @testing-library/react
- **API Testing**: @testing-library/node (for API routes)
- **Database Testing**: Separate test database + Prisma migrations
- **E2E Testing**: Playwright (optional, for critical flows)

### Test Database Strategy
- Use a separate PostgreSQL test database
- Run migrations before tests
- Reset database between test suites
- Use transactions for test isolation

---

## 2️⃣ AUTOMATIC TESTS

### A. Unit Tests (src/**/*.test.ts)

#### **Utilities to Test**:
1. `src/lib/date-format.ts` - Date formatting functions
2. `src/lib/qatar-timezone.ts` - Timezone conversions
3. `src/lib/csv-utils.ts` - CSV/Excel operations
4. `src/lib/asset-utils.ts` - Asset calculations
5. `src/lib/supplier-utils.ts` - Supplier helpers
6. `src/lib/utils/renewal-date.ts` - Renewal calculations

#### **Example Test Structure**:
```typescript
// src/lib/__tests__/date-format.test.ts
describe('Date Formatting', () => {
  test('formats date correctly', () => {
    expect(formatDate(new Date('2024-01-15'))).toBe('15/01/2024');
  });
});
```

### B. Integration Tests (API Routes)

#### **Critical API Routes to Test**:
1. **Assets API** (`/api/assets`)
   - GET /api/assets - List assets
   - POST /api/assets - Create asset
   - PUT /api/assets/[id] - Update asset
   - DELETE /api/assets/[id] - Delete asset

2. **Subscriptions API** (`/api/subscriptions`)
   - CRUD operations
   - Cancel/Reactivate flows
   - Renewal calculations

3. **Authentication** (`/api/auth`)
   - Login flows
   - Session management
   - Role-based access

#### **Example API Test**:
```typescript
// src/app/api/assets/__tests__/route.test.ts
describe('Assets API', () => {
  test('GET /api/assets returns assets list', async () => {
    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
  });
});
```

### C. Database Tests

#### **Database Operations to Test**:
1. **Prisma Client**
   - Connection initialization
   - CRUD operations
   - Relations and includes
   - Transactions

2. **Data Integrity**
   - Foreign key constraints
   - Required fields
   - Unique constraints
   - Cascading deletes

#### **Example Database Test**:
```typescript
// src/lib/__tests__/prisma.test.ts
describe('Database Operations', () => {
  test('creates asset successfully', async () => {
    const asset = await prisma.asset.create({
      data: { model: 'Test Asset', type: 'Laptop' }
    });
    expect(asset.id).toBeDefined();
  });
});
```

---

## 3️⃣ AUTOMATED TEST RUNNER

### NPM Scripts (package.json)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:db": "jest --testPathPattern=db.test",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "pretest": "npm run db:test:prepare"
  }
}
```

### VS Code Tasks
Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Tests",
      "type": "npm",
      "script": "test",
      "group": "test"
    },
    {
      "label": "Run Tests (Watch)",
      "type": "npm",
      "script": "test:watch"
    }
  ]
}
```

### Git Pre-commit Hook (Optional)
```bash
# .husky/pre-commit
npm run test:ci
```

---

## 4️⃣ MANUAL TESTING MODE

### Manual Test Script
Create `scripts/manual-test.ts`:
```typescript
// Interactive testing for key workflows
1. Database connection test
2. Authentication flow test
3. Asset CRUD operations
4. Subscription lifecycle test
5. Email sending test (dev mode)
```

### Run Manual Tests:
```bash
npm run test:manual
```

---

## 5️⃣ TEST REPORTING & MAINTENANCE

### Coverage Goals
- **Overall**: 70%+ coverage
- **Utilities**: 90%+ coverage
- **API Routes**: 60%+ coverage
- **Business Logic**: 80%+ coverage

### Test Report Generation
```bash
npm run test:coverage
# Generates: coverage/lcov-report/index.html
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:ci
```

---

## 📋 TESTING CHECKLIST

### Before Each Release:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Database tests pass
- [ ] Coverage > 70%
- [ ] No critical security vulnerabilities
- [ ] Manual smoke test completed

### Weekly Maintenance:
- [ ] Review test coverage report
- [ ] Add tests for new features
- [ ] Update outdated tests
- [ ] Clean up obsolete tests

---

## 🚀 QUICK START

```bash
# 1. Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# 2. Set up test database
npm run db:test:setup

# 3. Run all tests
npm test

# 4. Run with coverage
npm run test:coverage

# 5. Run in watch mode (development)
npm run test:watch
```

---

## 📚 Resources

- [Next.js Testing Documentation](https://nextjs.org/docs/app/building-your-application/testing)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

## 🎯 Testing Priorities

### High Priority (Implement First):
1. ✅ Date/timezone utilities (critical for renewals)
2. ✅ CSV import/export functions
3. ✅ Renewal date calculations
4. ✅ Asset lifecycle operations
5. ✅ Database CRUD operations

### Medium Priority:
6. ⏳ API route handlers
7. ⏳ Authentication flows
8. ⏳ Email sending
9. ⏳ File upload/storage

### Low Priority:
10. ⏸️ UI component tests
11. ⏸️ E2E user flows
12. ⏸️ Performance tests

---

**Last Updated**: 2025-11-05
**Next Review**: 2025-12-05
