# Cron Jobs & Background Tasks Security Audit

## Executive Summary

The platform has several cron endpoints for scheduled tasks. While most implement CRON_SECRET validation, one endpoint has a critical vulnerability that allows unauthenticated access.

## Cron Endpoints Found

| Endpoint | Schedule | Auth Check |
|----------|----------|------------|
| `/api/super-admin/backups/cron` | Daily 1 AM UTC | GOOD |
| `/api/cron/cleanup-deleted-users` | Daily 2 AM UTC | **VULNERABLE** |
| `/api/cron/depreciation` | Not scheduled | GOOD |
| `/api/cron/chat-cleanup` | Not scheduled | GOOD |

## Findings

### BLOCKER: Conditional Auth in cleanup-deleted-users

**File**: `src/app/api/cron/cleanup-deleted-users/route.ts:21-25`

```typescript
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Issue**: The condition `if (cronSecret && ...)` means if `CRON_SECRET` environment variable is NOT set, the check is skipped entirely, allowing unauthenticated access.

**Risk**: BLOCKER - In environments where CRON_SECRET is missing, anyone can:
1. Trigger user deletion ahead of schedule
2. Cause denial of service by mass-deleting users
3. Enumerate soft-deleted users through timing attacks

**Fix**:
```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### GOOD: Proper Auth in depreciation/route.ts

**File**: `src/app/api/cron/depreciation/route.ts:15-19`

```typescript
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}
```

This is the correct pattern - requires secret to be set AND match.

---

### GOOD: Proper Auth in backups/cron/route.ts

**File**: `src/app/api/super-admin/backups/cron/route.ts:23-26`

```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  return { valid: false, error: 'CRON_SECRET not configured' };
}
```

---

### MEDIUM: Depreciation Cron Not Scheduled

**File**: `vercel.json`

The depreciation endpoint exists but is NOT scheduled in vercel.json:
```json
"crons": [
  { "path": "/api/super-admin/backups/cron", "schedule": "0 1 * * *" },
  { "path": "/api/cron/cleanup-deleted-users", "schedule": "0 2 * * *" }
]
```

Missing:
- `/api/cron/depreciation` - Should run monthly (1st of month)
- `/api/cron/chat-cleanup` - Should run to clean up old AI chats

**Risk**: MEDIUM - Features may not work as expected without scheduled runs.

---

### LOW: Environment Variable Validation

**File**: `src/lib/env-validation.ts:27`

```typescript
{ name: 'CRON_SECRET', required: 'production', description: 'Secret for authenticating cron jobs' },
```

CRON_SECRET is only required in production. Development environments may be vulnerable.

**Risk**: LOW - Development environments shouldn't have sensitive data anyway.

---

## Cron Job Security Patterns

### Recommended Pattern (use everywhere):
```typescript
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // Require secret to exist AND match
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

### Anti-pattern (DO NOT USE):
```typescript
// WRONG: Allows access when secret not set
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return unauthorized();
}
```

---

## Webhook Security Review

### WhatsApp Webhook: `/api/webhooks/whatsapp`

Need to verify:
- [ ] Signature validation from WhatsApp
- [ ] Replay attack prevention
- [ ] Rate limiting

### Stripe Webhooks

Not found in codebase. If Stripe integration is added:
- Must validate webhook signature
- Must use idempotency keys

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| BLOCKER | Fix auth in cleanup-deleted-users | Low |
| MEDIUM | Add depreciation cron to vercel.json | Low |
| MEDIUM | Add chat-cleanup cron to vercel.json | Low |
| LOW | Standardize cron auth pattern | Low |

---

## Verification Checklist

- [ ] All cron endpoints validate CRON_SECRET
- [ ] All cron endpoints require secret to be SET (not just match)
- [ ] All scheduled crons are in vercel.json
- [ ] Webhook signatures validated
- [ ] No sensitive data in cron responses
