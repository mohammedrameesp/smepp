# Super Admin & Impersonation Security Audit

## Executive Summary

The super admin system provides platform-wide management capabilities with impersonation features. The implementation includes 2FA enforcement, JWT-based impersonation tokens with revocation support, and audit logging.

## Architecture Overview

### Super Admin Authentication Flow
1. Email/password login via `/super-admin` page
2. 2FA verification if enabled
3. Login token issued with `purpose: 'super-admin-login'` and `twoFactorVerified: true`
4. Session established via `super-admin-credentials` provider

### Impersonation Flow
1. Super admin requests impersonation via `/api/super-admin/impersonate`
2. JWT token generated with:
   - `purpose: 'impersonation'`
   - `jti` (unique ID for revocation)
   - Organization context
   - 15-minute expiry
3. Token passed as URL parameter to tenant subdomain
4. Middleware verifies token, sets cookie, injects headers
5. Subsequent requests use cookie until expiry

## Findings

### GOOD: Security Measures Implemented

**2FA Enforcement** (`src/lib/core/auth.ts:313-317`):
```typescript
if (user.twoFactorEnabled && !payload.twoFactorVerified) {
  return null;
}
```

**Token Revocation** (`src/lib/security/impersonation.ts`):
- Unique JTI per token
- Database-backed revocation list
- Revocation check on every API request
- Fail-safe on DB errors (treats as revoked)

**Short Token TTL** (`src/middleware.ts:404`):
```typescript
maxAge: 15 * 60, // 15 minutes
```

**Strict Cookie Settings** (`src/middleware.ts:400-403`):
```typescript
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'strict',
```

---

### HIGH: Impersonation Grants OWNER Role

**File**: `src/middleware.ts:389,434`

```typescript
response.headers.set('x-org-role', 'OWNER');
```

Super admin impersonation grants OWNER role, which provides:
- Full access to all organization data
- Ability to delete any data
- Access to billing (if implemented)
- User management capabilities

**Risk**: HIGH - A compromised super admin account could damage any organization.

**Mitigations in place**:
- 2FA enforcement
- Short token TTL (15 min)
- Token revocation capability
- Audit logging

**Recommendations**:
1. Consider "read-only" impersonation mode for investigation
2. Alert organization admins when impersonation starts
3. Restrict destructive operations during impersonation

---

### HIGH: Super Admin Route Protection

**File**: `src/middleware.ts:552-560`

```typescript
if (SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
  const isSuperAdmin = token.isSuperAdmin as boolean | undefined;
  if (!isSuperAdmin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}
```

Super admin routes only checked in middleware. API routes in `/api/super-admin/**` should independently verify `isSuperAdmin`.

**Verification needed**: Ensure ALL `/api/super-admin/**` routes verify super admin status.

---

### MEDIUM: Token Revocation Cleanup

**File**: `src/lib/security/impersonation.ts:118-128`

```typescript
export async function cleanupExpiredRevocations(): Promise<number> {
  const result = await prisma.revokedImpersonationToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}
```

Cleanup function exists but may not be scheduled.

**Risk**: MEDIUM - Revocation table could grow unbounded.

**Recommendation**: Ensure cron job calls `cleanupExpiredRevocations()` daily.

---

### MEDIUM: Impersonation Token in URL

**File**: `src/middleware.ts:376`

```typescript
const impersonateToken = request.nextUrl.searchParams.get('impersonate');
```

Token initially passed as URL parameter, which:
- May appear in server logs
- May appear in browser history
- Could be leaked via Referer header

**Mitigations in place**:
- Token stored in httpOnly cookie after first use
- Short TTL (15 min)
- Token not reusable after cookie is set (though not explicitly prevented)

**Risk**: MEDIUM - Acceptable given mitigations.

**Recommendations**:
1. Strip token from URL after setting cookie (redirect without param)
2. Ensure server access logs don't retain full URLs

---

### MEDIUM: Revoke All Tokens Incomplete

**File**: `src/lib/security/impersonation.ts:82-112`

```typescript
export async function revokeAllTokensForSuperAdmin(
  superAdminId: string,
  // ...
): Promise<number> {
  // This function is a placeholder for future enhancement
  return 0;
}
```

The "revoke all" functionality is not fully implemented. Cannot mass-revoke all active tokens for a compromised super admin.

**Risk**: MEDIUM - If super admin account is compromised, can only revoke known tokens.

**Recommendation**: Implement active token tracking or timestamp-based revocation.

---

### LOW: Console Logging of Sensitive Events

**File**: `src/lib/core/auth.ts:291,309,325`

```typescript
console.error('Invalid token purpose:', payload.purpose);
console.error('User not found or not super admin');
console.error('2FA required but not verified in token');
```

Security events logged to console may not be captured by logging infrastructure.

**Risk**: LOW - Not a security vulnerability, but reduces observability.

**Recommendation**: Use structured logging that integrates with monitoring.

---

## Audit Logging Assessment

**Current Implementation** (`src/lib/core/activity.ts`):
- Activity logs stored in database
- Tenant-scoped
- Includes impersonation events

**Logged Events**:
- `SECURITY_IMPERSONATION_BLOCKED` - When revoked token is used
- `SECURITY_IMPERSONATION_REVOKED` - When token is revoked

**Missing Events** (should add):
- Impersonation session started
- Impersonation session ended
- Super admin login
- Super admin 2FA verification

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| HIGH | Verify all /api/super-admin routes check isSuperAdmin | Medium |
| HIGH | Add impersonation start/end audit logs | Low |
| MEDIUM | Implement revoke-all functionality | Medium |
| MEDIUM | Schedule revocation cleanup cron | Low |
| MEDIUM | Strip token from URL after use | Low |
| LOW | Use structured logging for security events | Medium |

---

---

## Super Admin API Route Audit (2026-01-10)

**Total routes audited**: 32

### CRITICAL: Unauthenticated Endpoints

#### 1. ~~`set-password/route.ts` - NO AUTH (CRITICAL)~~ FIXED ✅

**Status**: ✅ Fixed

**Issue**: ~~Allowed ANY unauthenticated user to set ANY user's password.~~

**Fix Applied**:
```typescript
// SECURITY: Require super admin authentication
const session = await getServerSession(authOptions);
if (!session?.user?.isSuperAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Plus audit logging for all password resets.

---

#### 2. `stats/route.ts` - NO AUTH (Intentional)

**Status**: ✅ Acceptable

**Rationale**: This endpoint is intentionally unauthenticated to display platform stats on the super admin login page (before authentication). Only aggregate counts are exposed - no PII.

**Documentation Added**: Comment explaining intentional design decision.

---

#### 3. `impersonation/end/route.ts` - Intentionally Open

**Status**: ✅ OK

**Rationale**: This endpoint only clears cookies and revokes tokens. The impersonation cookie itself is cryptographically signed, so no privilege escalation is possible.

---

#### 4. `backups/cron/route.ts` - CRON_SECRET Auth

**Status**: ✅ OK

**Rationale**: Uses CRON_SECRET bearer token auth, appropriate for scheduled tasks.

---

### Routes with Proper isSuperAdmin Checks

All other 28 routes properly verify `isSuperAdmin`:

| Route | Methods | Auth ✅ |
|-------|---------|---------|
| `/admins/route.ts` | GET, POST | ✅ |
| `/admins/[id]/route.ts` | GET, PUT, DELETE | ✅ |
| `/ai-usage/route.ts` | GET | ✅ |
| `/analytics/detailed/route.ts` | GET | ✅ |
| `/auth/backup-codes/route.ts` | POST | ✅ |
| `/auth/enable-2fa/route.ts` | POST | ✅ |
| `/auth/login/route.ts` | POST | ✅ (validates credentials) |
| `/auth/setup-2fa/route.ts` | POST | ✅ |
| `/auth/verify-2fa/route.ts` | POST | ✅ |
| `/backups/route.ts` | GET, POST | ✅ |
| `/backups/restore/route.ts` | POST | ✅ |
| `/backups/[path]/route.ts` | GET, DELETE | ✅ |
| `/impersonate/route.ts` | POST | ✅ |
| `/impersonation/revoke/route.ts` | POST | ✅ |
| `/import-becreative/route.ts` | POST | ✅ |
| `/invitations/route.ts` | GET | ✅ |
| `/invitations/[id]/resend/route.ts` | POST | ✅ |
| `/organizations/route.ts` | GET, POST | ✅ |
| `/organizations/[id]/route.ts` | GET, PUT, DELETE | ✅ |
| `/organizations/[id]/auth-config/route.ts` | PUT | ✅ |
| `/organizations/[id]/invitations/route.ts` | GET, POST | ✅ |
| `/organizations/[id]/whatsapp/route.ts` | GET, PUT | ✅ |
| `/reset-platform/route.ts` | POST, DELETE | ✅ |
| `/seed-comprehensive/route.ts` | POST | ✅ |
| `/seed-leave-types/route.ts` | POST | ✅ |
| `/storage/route.ts` | GET | ✅ |
| `/whatsapp/config/route.ts` | GET, PUT, DELETE | ✅ |
| `/whatsapp/stats/route.ts` | GET | ✅ |

---

## Verification Checklist

- [x] 2FA enforced for super admins
- [x] Impersonation tokens have short TTL
- [x] Token revocation implemented
- [x] Strict cookie settings for impersonation
- [x] All super admin API routes protected ✅
- [x] Fix set-password endpoint ✅ DONE
- [x] Stats endpoint documented as intentional ✅
- [x] Super admin login audit logging ✅ DONE
- [x] Super admin 2FA audit logging ✅ DONE
- [x] Impersonation start/end/revoke logged ✅ (already implemented)
- [ ] Revoke-all implemented
- [ ] Cleanup cron scheduled
