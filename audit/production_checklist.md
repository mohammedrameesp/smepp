# Production Deployment Checklist

## Pre-Deployment Requirements

### Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXTAUTH_SECRET` | [ ] | 32+ bytes, cryptographically secure |
| `NEXTAUTH_URL` | [ ] | Production domain |
| `DATABASE_URL` | [ ] | PostgreSQL with SSL |
| `DIRECT_URL` | [ ] | Direct DB connection for migrations |
| `CRON_SECRET` | [ ] | Secure random token |
| `SUPABASE_URL` | [ ] | Storage endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | [ ] | Service key (never expose) |
| `GOOGLE_CLIENT_ID` | [ ] | OAuth provider |
| `GOOGLE_CLIENT_SECRET` | [ ] | OAuth provider |
| `AZURE_AD_CLIENT_ID` | [ ] | OAuth provider |
| `AZURE_AD_CLIENT_SECRET` | [ ] | OAuth provider |
| `STRIPE_SECRET_KEY` | [ ] | Billing (if enabled) |
| `STRIPE_WEBHOOK_SECRET` | [ ] | Webhook validation |
| `ANTHROPIC_API_KEY` | [ ] | AI chat (if enabled) |

### Development Flags

| Flag | Required Value | Notes |
|------|----------------|-------|
| `DEV_AUTH_ENABLED` | `false` | MUST be false in production |
| `NODE_ENV` | `production` | Production mode |

---

## Security Checklist

### Authentication

- [ ] NEXTAUTH_SECRET is 32+ bytes
- [ ] OAuth redirect URIs are production URLs
- [ ] 2FA enabled for super admin accounts
- [ ] Password policy meets requirements
- [ ] Account lockout configured

### Authorization

- [ ] All API routes use `withErrorHandler`
- [ ] Sensitive routes have `requireAuth`
- [ ] Admin routes have `requireAdmin`
- [ ] Module routes have `requireModule`

### Tenant Isolation

- [ ] **BLOCKER**: All tenant models in TENANT_MODELS list
- [ ] No direct Prisma imports in API routes
- [ ] Raw queries have manual tenant filter

### CSRF & Session

- [ ] CSRF protection enabled
- [ ] Secure cookie settings (httpOnly, secure, sameSite)
- [ ] Session invalidation on password change

### Cron Security

- [ ] **BLOCKER**: Fix cleanup-deleted-users auth
- [ ] All cron endpoints validate CRON_SECRET
- [ ] Cron jobs scheduled in vercel.json

---

## Database Checklist

- [ ] Database backup enabled
- [ ] Connection uses SSL
- [ ] Connection pooling configured
- [ ] Migrations applied (`prisma db push`)
- [ ] Indexes created for tenant queries

---

## Infrastructure Checklist

### Vercel Configuration

- [ ] Production environment variables set
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Region set (bom1 - Mumbai)

### Monitoring

- [ ] Error tracking (Sentry recommended)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Log aggregation

### Security Headers

Verify in production:
```
Content-Security-Policy: configured
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

---

## Pre-Launch Testing

### Critical Flows

- [ ] User signup flow
- [ ] User login flow (all providers)
- [ ] Organization creation
- [ ] Team member invitation
- [ ] Employee profile creation
- [ ] Asset CRUD operations
- [ ] Leave request workflow
- [ ] Payroll run (if enabled)

### Security Tests

- [ ] Attempt cross-tenant access
- [ ] Attempt unauthenticated API access
- [ ] Attempt CSRF attack
- [ ] Test rate limiting

---

## Post-Deployment

### Immediate (Day 1)

- [ ] Verify all routes accessible
- [ ] Create test organization
- [ ] Verify OAuth flows work
- [ ] Check error logging works
- [ ] Verify cron jobs running

### First Week

- [ ] Monitor error rates
- [ ] Review security logs
- [ ] Check database performance
- [ ] Verify backups running

### Ongoing

- [ ] Weekly dependency updates
- [ ] Monthly security review
- [ ] Quarterly penetration test
