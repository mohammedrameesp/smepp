# Tenant Isolation Security Audit

## Executive Summary

The Durj platform implements tenant isolation through a Prisma client extension that automatically filters all queries by `tenantId`. This is a solid architectural approach, but several gaps were identified.

## Architecture Overview

### Tenant Isolation Flow
1. **Middleware** (`src/middleware.ts`): Extracts tenant context from JWT session, sets `x-tenant-id` header
2. **API Handler** (`src/lib/http/handler.ts`): Reads headers, creates tenant-scoped Prisma client
3. **Prisma Extension** (`src/lib/core/prisma-tenant.ts`): Intercepts all queries, injects tenant filter

## Findings

### BLOCKER: Missing Models in TENANT_MODELS List

**File**: `src/lib/core/prisma-tenant.ts:47-77`

The `TENANT_MODELS` array is missing several tenant-scoped models that exist in the schema:

**Missing Models** (verified against `prisma/schema.prisma`):
- `TeamMember` - Contains all employee/user data
- `DepreciationCategory` - Asset depreciation settings
- `DepreciationRecord` - Depreciation calculations
- `RolePermission` - Custom role permissions
- `ChatConversation` - AI chat history
- `AIChatUsage` - AI token tracking
- `AIChatAuditLog` - AI audit logs
- `WhatsAppConfig` - WhatsApp integration
- `WhatsAppUserPhone` - User phone mapping
- `WhatsAppActionToken` - Action tokens
- `WhatsAppMessageLog` - Message logs
- `AssetRequestHistory` - Asset request audit trail
- `SubscriptionHistory` - Subscription audit trail
- `LeaveRequestHistory` - Leave request audit trail
- `PurchaseRequestHistory` - Purchase request audit trail
- `PayrollHistory` - Payroll audit trail
- `SalaryStructureHistory` - Salary audit trail
- `LoanRepayment` - Loan repayment records
- `PayslipDeduction` - Payslip deduction details
- `PurchaseRequestItem` - Purchase request line items
- `OrganizationSetupProgress` - Onboarding progress

**Listed but may not exist**:
- `HRProfile` - Marked as removed in schema comments
- `Project` - Not found in schema

**Risk**: HIGH - Queries on these models will NOT be tenant-filtered, potentially allowing cross-tenant data access.

**Recommendation**: Update TENANT_MODELS to include all models with `tenantId` field. Consider generating this list automatically from the Prisma schema.

---

### BLOCKER: Raw Queries Bypass Tenant Filter

**File**: `src/lib/core/prisma-tenant.ts`

The Prisma extension does NOT intercept `$queryRaw` or `$executeRaw` operations.

```typescript
// These bypass tenant filtering entirely:
prisma.$queryRaw`SELECT * FROM "Asset" WHERE id = ${id}`
prisma.$executeRaw`DELETE FROM "Asset" WHERE id = ${id}`
```

**Risk**: HIGH - Any raw SQL queries completely bypass tenant isolation.

**Recommendation**:
1. Search codebase for all `$queryRaw` and `$executeRaw` usage
2. Either block these methods on the tenant client or ensure manual tenant filtering
3. Add runtime warnings/errors for raw query attempts

---

### HIGH: Header Spoofing Risk

**File**: `src/middleware.ts`, `src/lib/http/handler.ts`

Tenant context is passed via HTTP headers (`x-tenant-id`, `x-user-id`, etc.). While middleware sets these from verified JWT, there's a theoretical risk if:

1. Middleware doesn't run on certain routes
2. A misconfigured CDN/proxy passes client headers through

**Current Mitigations**:
- Middleware runs on all non-static routes (good)
- Handler validates session independently (good)

**Risk**: MEDIUM - Architecture is sound but defense-in-depth could be improved.

**Recommendation**: Add validation in handler.ts to ensure headers match session data when both are present.

---

### MEDIUM: Inconsistent Tenant Context for Super Admin

**File**: `src/middleware.ts:386-408`, `src/lib/http/handler.ts:351-354`

When super admin impersonates, they get OWNER role:
```typescript
response.headers.set('x-org-role', 'OWNER');
```

This grants full access to all tenant operations, which is intentional but:
1. Audit logs may not clearly distinguish impersonated actions
2. No restrictions on destructive operations during impersonation

**Risk**: MEDIUM - Impersonation is powerful and should have audit trail.

**Recommendation**:
- Ensure all actions during impersonation are logged with `x-impersonating: true` flag
- Consider restricting certain operations during impersonation (e.g., data deletion)

---

### MEDIUM: findUnique Post-Fetch Verification

**File**: `src/lib/core/prisma-tenant.ts:124-133`

For `findUnique`, tenant verification happens AFTER the fetch:
```typescript
async findUnique({ model, args, query }) {
  const result = await query(args);
  if (result && isTenantModel(model) && 'tenantId' in result) {
    if (result.tenantId !== tenantId) {
      return null; // Deny cross-tenant access
    }
  }
  return result;
}
```

**Issue**: The query still executes against the database, potentially revealing timing information.

**Risk**: LOW - Data is not returned, but timing side-channel exists.

**Recommendation**: For `findUnique` with compound keys that include tenant-scoped relations, consider adding `tenantId` to the where clause before query execution.

---

### LOW: Cascade Delete Risk

**File**: `prisma/schema.prisma`

Several models use `onDelete: Cascade`. While this is generally correct, need to verify cascades don't cross tenant boundaries.

Example safe cascade:
```prisma
model Asset {
  tenant Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```
If org is deleted, all its assets are deleted - correct behavior.

**Risk**: LOW - Cascades appear properly scoped.

---

## Direct Prisma Import Audit Required

Need to verify no files directly import raw prisma for tenant-scoped operations:

**Allowed direct imports**:
- `src/lib/http/handler.ts` (creates tenant client)
- `src/app/api/super-admin/**` (cross-tenant operations)
- `src/lib/core/auth.ts` (user lookup before tenant context)
- Cron jobs (system-level operations)

**Flag any other direct imports** of `@/lib/core/prisma` or `@prisma/client`.

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| BLOCKER | Add missing models to TENANT_MODELS | Low |
| BLOCKER | Block or audit $queryRaw/$executeRaw | Medium |
| HIGH | Scan for direct Prisma imports | Medium |
| MEDIUM | Enhance impersonation audit logging | Low |
| MEDIUM | Validate headers match session | Low |
| LOW | Review cascade delete chains | Low |

---

## Verification Checklist

- [ ] All tenant-scoped models in TENANT_MODELS
- [ ] No $queryRaw/$executeRaw in tenant code
- [ ] No unauthorized direct Prisma imports
- [ ] Impersonation actions logged
- [ ] Cascade deletes verified
