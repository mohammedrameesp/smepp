# File Inventory - Durj Production Audit

Generated: 2026-01-10

## Summary

- **Total Files**: 1019
- **Excluded**: node_modules, .next, .git, dist, coverage, .turbo, .vercel

## File Counts by Extension

| Extension | Count |
|-----------|-------|
| .tsx | ~350 |
| .ts | ~650 |
| .json | ~15 |
| .md | ~25 |
| .prisma | 1 |
| .css | 3 |

## File Counts by Top-Level Directory

| Directory | Count |
|-----------|-------|
| src/app/api/ | ~200 |
| src/app/admin/ | ~100 |
| src/app/employee/ | ~50 |
| src/app/super-admin/ | ~25 |
| src/components/ | ~130 |
| src/features/ | ~180 |
| src/lib/ | ~150 |
| src/hooks/ | ~15 |
| tests/ | ~120 |
| prisma/ | 2 |
| scripts/ | 3 |

## Critical Security Files

### Authentication & Authorization
- `src/lib/core/auth.ts`
- `src/lib/oauth/utils.ts`
- `src/lib/oauth/google.ts`
- `src/lib/oauth/azure.ts`
- `src/middleware.ts`
- `src/lib/security/csrf.ts`
- `src/lib/security/impersonation.ts`
- `src/lib/security/account-lockout.ts`
- `src/lib/security/password-validation.ts`
- `src/lib/security/rateLimit.ts`

### Multi-Tenant
- `src/lib/core/prisma-tenant.ts`
- `src/lib/http/handler.ts`
- `src/lib/multi-tenant/feature-flags.ts`
- `src/lib/multi-tenant/limits.ts`
- `src/lib/multi-tenant/subdomain.ts`

### Super Admin
- `src/app/api/super-admin/**` (~30 routes)
- `src/app/super-admin/**` (~15 pages)
- `src/lib/two-factor/**`

### API Routes (200+ files)
- `src/app/api/**/*.ts`

## Environment Files
- `.env`
- `.env.local`
- `.env.production.local`
