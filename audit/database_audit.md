# Prisma & Database Security Audit

## Executive Summary

The database schema is well-designed for multi-tenancy with proper `tenantId` fields and indexes. However, several models are missing from the tenant isolation list, and some indexes could be optimized.

## Schema Security Assessment

### BLOCKER: Models Missing from TENANT_MODELS

The following models have `tenantId` but are NOT in the `TENANT_MODELS` list in `prisma-tenant.ts`:

| Model | Risk | Notes |
|-------|------|-------|
| `TeamMember` | HIGH | Contains ALL employee data |
| `DepreciationCategory` | MEDIUM | Asset depreciation settings |
| `DepreciationRecord` | MEDIUM | Depreciation calculations |
| `RolePermission` | HIGH | Custom role permissions |
| `ChatConversation` | HIGH | AI chat history - sensitive |
| `AIChatUsage` | LOW | Token usage tracking |
| `AIChatAuditLog` | LOW | AI audit logs |
| `WhatsAppConfig` | HIGH | WhatsApp credentials |
| `WhatsAppUserPhone` | MEDIUM | User phone mapping |
| `WhatsAppActionToken` | MEDIUM | Action tokens |
| `WhatsAppMessageLog` | LOW | Message logs |
| `AssetRequestHistory` | LOW | Audit trail |
| `SubscriptionHistory` | LOW | Audit trail |
| `LeaveRequestHistory` | LOW | Audit trail |
| `PurchaseRequestHistory` | LOW | Audit trail |
| `PayrollHistory` | MEDIUM | Salary history |
| `SalaryStructureHistory` | MEDIUM | Salary structure changes |
| `LoanRepayment` | MEDIUM | Loan repayment records |
| `PayslipDeduction` | MEDIUM | Payslip deduction details |
| `PurchaseRequestItem` | LOW | Purchase request line items |
| `OrganizationSetupProgress` | LOW | Onboarding progress |

**Action Required**: Add all models with `tenantId` to `TENANT_MODELS` array.

---

### GOOD: Proper Tenant Indexes

All tenant-scoped models have proper indexes:
```prisma
@@index([tenantId])
```

This ensures efficient query filtering by tenant.

---

### GOOD: Cascade Delete Configuration

Cascade deletes are properly configured to clean up tenant data:
```prisma
tenant Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)
```

When an organization is deleted, all tenant data is automatically deleted.

---

### MEDIUM: Encrypted Fields at Rest

**File**: `prisma/schema.prisma:377-381`

OAuth secrets are stored in database:
```prisma
customGoogleClientSecret String? // Encrypted at rest
customAzureClientSecret  String? // Encrypted at rest
```

**Verification needed**:
- [ ] Confirm encryption is actually applied (not just commented)
- [ ] Verify encryption key management
- [ ] Check if database-level encryption is enabled

---

### MEDIUM: Sensitive Data in Schema

The following fields contain sensitive data:

| Field | Model | Risk |
|-------|-------|------|
| `passwordHash` | User | Password hash - ensure bcrypt |
| `twoFactorSecret` | User | TOTP secret - should be encrypted |
| `twoFactorBackupCodes` | User | Backup codes - should be hashed |
| `customGoogleClientSecret` | Organization | OAuth secret |
| `customAzureClientSecret` | Organization | OAuth secret |

---

### LOW: Missing Soft Delete

Most entities don't have soft delete capability. Consider adding for:
- TeamMember (employee records)
- Asset (audit trail)
- Payslip (legal retention)

---

## Query Pattern Analysis

### N+1 Query Risks

Common patterns that may cause N+1 queries:
- Loading team members with their user data
- Loading assets with assignments
- Loading notifications with actor details

**Recommendation**: Use `include` or `select` in queries, or implement DataLoader pattern.

---

### Missing Pagination

Verify pagination is implemented for:
- [ ] Employee list
- [ ] Asset list
- [ ] Leave requests
- [ ] Purchase requests
- [ ] Activity logs

---

## Connection Security

### GOOD: Direct URL for Migrations

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Using `directUrl` for migrations avoids connection pooler issues.

---

### Verify SSL Connection

Ensure `DATABASE_URL` includes SSL:
```
postgresql://...?sslmode=require
```

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| BLOCKER | Add missing models to TENANT_MODELS | Low |
| MEDIUM | Verify OAuth secret encryption | Low |
| MEDIUM | Verify 2FA secret encryption | Low |
| LOW | Add soft delete to key models | Medium |
| LOW | Review N+1 query patterns | Medium |

---

## Verification Checklist

- [ ] All tenant-scoped models in TENANT_MODELS
- [ ] OAuth secrets encrypted at rest
- [ ] 2FA secrets encrypted at rest
- [ ] Database SSL enabled
- [ ] Connection pooling configured
- [ ] Indexes optimized for common queries
