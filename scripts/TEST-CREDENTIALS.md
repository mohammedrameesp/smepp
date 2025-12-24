# Test Organization Credentials

These test organizations were created by `scripts/seed-test-tenants.ts` to verify multi-tenant isolation.

## Acme Corp

- **Subdomain:** acme-corp.quriosityhub.com
- **Data Prefix:** ACME-

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@acme-corp.test | Test123! |
| Employee | employee1@acme-corp.test | Test123! |
| Employee | employee2@acme-corp.test | Test123! |

## Globex Inc

- **Subdomain:** globex-inc.quriosityhub.com
- **Data Prefix:** GLOBEX-

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@globex-inc.test | Test123! |
| Employee | employee1@globex-inc.test | Test123! |
| Employee | employee2@globex-inc.test | Test123! |

## Test Data Created

Each organization has isolated test data:

- **3 Assets** (laptops, monitors, etc.)
- **2 Subscriptions** (software services)
- **2 Leave Types** (annual leave, sick leave)
- **1 Supplier**
- **1 Project**
- **3 Users** (1 admin, 2 employees)

## Verifying Tenant Isolation

1. Login to Acme Corp - you should only see ACME-prefixed data
2. Login to Globex Inc - you should only see GLOBEX-prefixed data
3. Run `npx ts-node scripts/test-tenant-isolation.ts` for database-level verification

## Re-seeding Test Data

To reset/reseed the test organizations:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-test-tenants.ts
```

Note: This will delete and recreate acme-corp and globex-inc organizations only.
