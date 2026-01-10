# Authentication & Authorization Security Audit

## Executive Summary

The authentication system uses NextAuth.js with multiple providers (Google, Azure AD, Credentials). The implementation includes solid security measures including brute-force protection, account lockout, password change session invalidation, and 2FA for super admins.

## Architecture Overview

### Authentication Providers
1. **Google OAuth** - Primary social login
2. **Azure AD** - Enterprise customers
3. **Credentials** - Email/password for TeamMembers
4. **Super Admin Credentials** - Separate provider with 2FA enforcement

### Session Strategy
- JWT-based sessions (not database sessions)
- 7-day session max age
- Session invalidation on password change
- Security check every 5 minutes (optimized from every request)

## Findings

### GOOD: Security Measures Implemented

**File**: `src/lib/core/auth.ts`

1. **Brute-Force Protection** (lines 137-166):
   - Account lockout after failed attempts
   - Separate tracking for TeamMembers and Users
   - Clear error messages without leaking info

2. **Password Change Invalidation** (lines 579-633):
   - Sessions invalidated when password is changed
   - Checks `passwordChangedAt` against token `iat`

3. **2FA Enforcement for Super Admins** (lines 313-317):
   ```typescript
   if (user.twoFactorEnabled && !payload.twoFactorVerified) {
     console.error('2FA required but not verified in token');
     return null;
   }
   ```

4. **Secure Cookie Configuration** (lines 838-876):
   - `httpOnly: true`
   - `secure: true` in production
   - `sameSite: 'lax'`
   - `__Secure-` prefix in production
   - `__Host-` prefix for CSRF token

---

### MEDIUM: Session Security Check Interval

**File**: `src/lib/core/auth.ts:584-587`

```typescript
const SECURITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

Security checks (password change, account deactivation) only run every 5 minutes for performance. This means a deactivated user could continue accessing the system for up to 5 minutes.

**Risk**: MEDIUM - Acceptable tradeoff for performance, but document this behavior.

**Recommendation**: Consider shorter interval for admin actions or immediate invalidation for critical deactivations.

---

### MEDIUM: OAuth Account Linking

**File**: `src/lib/core/auth.ts:529-553`

When a user logs in via OAuth and an account exists with their email, the OAuth account is automatically linked:

```typescript
if (!accountExists) {
  await prisma.account.create({
    data: {
      userId: existingUser.id,
      // ... links OAuth to existing user
    },
  });
}
```

**Risk**: MEDIUM - If attacker knows victim's email and can control an OAuth provider (e.g., custom Azure tenant), they could potentially link their OAuth to victim's account.

**Mitigations in place**:
- Only links if email matches exactly
- User must already exist in database

**Recommendation**: Consider requiring email verification before OAuth linking, or confirmation from existing account.

---

### MEDIUM: Auto Super Admin Promotion

**File**: `src/lib/core/auth.ts:556-560`

```typescript
if (isSuperAdmin && !existingUser.isSuperAdmin) {
  await prisma.user.update({
    where: { id: existingUser.id },
    data: { isSuperAdmin: true },
  });
}
```

If `SUPER_ADMIN_EMAIL` env var matches a user's email, they're auto-promoted to super admin.

**Risk**: MEDIUM - Misconfiguration could grant unintended super admin access.

**Recommendation**: Log and alert on super admin promotions. Consider requiring manual promotion in production.

---

### LOW: Redirect Callback

**File**: `src/lib/core/auth.ts:813-823`

```typescript
async redirect({ url, baseUrl }) {
  if (url === baseUrl || url === `${baseUrl}/`) {
    return `${baseUrl}/`;
  }
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  if (new URL(url).origin === baseUrl) return url;
  return baseUrl;
}
```

**Assessment**: GOOD - Properly prevents open redirects by:
1. Allowing relative URLs
2. Checking same origin
3. Defaulting to baseUrl

---

### LOW: JWT Secret Validation

**File**: `src/lib/core/auth.ts:45-50`

```typescript
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable is required. ' +
    'Generate one with: openssl rand -base64 32'
  );
}
```

**Assessment**: GOOD - Fails fast if secret is missing.

---

## CSRF Protection Review

**File**: `src/lib/security/csrf.ts`

### GOOD: Solid Implementation

1. **Origin Validation** for JSON APIs (lines 59-115):
   - Validates Origin/Referer headers
   - Checks against app domain and subdomains
   - Blocks cross-origin in production

2. **Token-based CSRF** for forms (lines 136-148):
   - HMAC-signed tokens
   - Timing-safe comparison
   - Cookie + header double-submit pattern

3. **Proper Exclusions** (lines 155-156):
   - Skips NextAuth endpoints (has own CSRF)
   - Skips webhooks (signature validation)

---

## Authorization Check Review

### Role Hierarchy
1. **Super Admin** (`isSuperAdmin: true`) - Platform-level admin
2. **Team Member Roles**: ADMIN, MEMBER
3. **Legacy Approval Roles**: ADMIN, MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR

### Handler Options
- `requireAuth` - Requires authenticated session
- `requireAdmin` - Requires `teamMemberRole === 'ADMIN'`
- `requireApproverRole` - Requires specific approval role
- `requireOrgRole` - Requires OWNER/ADMIN/MANAGER/MEMBER
- `requirePermission` - Granular permission check

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| MEDIUM | Review OAuth linking security | Medium |
| MEDIUM | Document session invalidation delay | Low |
| MEDIUM | Add logging for super admin promotions | Low |
| LOW | Review approval role usage consistency | Medium |

---

## Verification Checklist

- [x] NEXTAUTH_SECRET validated at startup
- [x] Secure cookie configuration
- [x] Brute-force protection enabled
- [x] Password change invalidates sessions
- [x] 2FA enforced for super admins
- [x] CSRF protection for mutations
- [x] Open redirect prevention
- [ ] OAuth linking security review
- [ ] Super admin promotion logging
