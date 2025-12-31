# Production Deployment Guide

This guide covers the steps required to deploy Durj to production.

## Pre-Deployment Checklist

### 1. Environment Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_APP_DOMAIN` | Production domain (no protocol) | `yourdomain.com` |
| `CRON_SECRET` | Secret for cron job authentication | Generate with: `openssl rand -hex 32` |

### 2. Environment Variables (Recommended)

| Variable | Description | Purpose |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry project DSN | Error tracking |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Distributed rate limiting |
| `RESEND_API_KEY` | Resend.com API key | Email sending |
| `RESEND_FROM_EMAIL` | Sender email address | Email sending |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google login |
| `AZURE_AD_CLIENT_ID` | Microsoft OAuth client ID | Microsoft login |
| `AZURE_AD_CLIENT_SECRET` | Microsoft OAuth secret | Microsoft login |

### 3. Security Configuration

**CRITICAL: Set these correctly in production:**

```env
# MUST be false in production - enables test user bypass if true
DEV_AUTH_ENABLED=false

# MUST be strong and unique - never reuse or use predictable values
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### 4. Database Migration

Run migrations before deploying:

```bash
npx prisma migrate deploy
```

Or let the build process handle it (configured in `package.json`).

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   - Link your GitHub repository to Vercel

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required variables for Production environment

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (includes Prisma generate + migrate)
   - Install Command: `npm install`

4. **Deploy**
   - Push to main branch or trigger manual deploy

### Vercel Cron Jobs

Cron jobs are configured in `vercel.json`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/super-admin/backups/cron` | Daily 1 AM UTC | Database backups |
| `/api/cron/cleanup-deleted-users` | Daily 2 AM UTC | GDPR user cleanup |

**Authentication**: Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` header.

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://app.yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "..."
}
```

### 2. Authentication Test

1. Navigate to login page
2. Test OAuth providers (Google, Microsoft)
3. Test email/password login
4. Verify session persistence

### 3. Multi-Tenant Test

1. Create test organization
2. Verify subdomain routing (`test.yourdomain.com`)
3. Verify data isolation

### 4. Cron Job Verification

Check Vercel dashboard for cron job execution logs.

## Monitoring

### Error Tracking

Sentry is configured automatically when `SENTRY_DSN` is set.

- Errors appear in Sentry dashboard
- Source maps are uploaded during build
- Session replay available for debugging

### Logging

- Application logs visible in Vercel dashboard
- Request logs include timing and user context
- Error logs include stack traces

## Rollback Procedure

1. **Via Vercel Dashboard**
   - Go to Deployments
   - Find previous working deployment
   - Click "..." > "Promote to Production"

2. **Database Rollback** (if needed)
   - Restore from backup (stored in Supabase `database-backups` bucket)
   - Run: `npx prisma migrate resolve --rolled-back <migration-name>`

## Security Hardening

### Headers

The following security headers are automatically applied:
- HSTS (2 years with preload)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- CSP (Content Security Policy)
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting

- General API: 60 requests/minute
- Authentication: 5 attempts/15 minutes
- Uses Redis when available, falls back to in-memory

### Session Security

- JWT tokens with 14-day expiry
- HttpOnly, Secure, SameSite=Lax cookies
- 2FA required for super admin

## Troubleshooting

### "Missing required env var" errors

Run the environment validation:
```typescript
import { validateEnv } from '@/lib/env-validation';
const result = validateEnv();
console.log(result);
```

### OAuth not working

1. Verify OAuth provider credentials are set
2. Check callback URLs in provider console
3. Ensure `NEXTAUTH_URL` matches production URL

### Rate limiting issues

1. Check if Redis is connected (logs will show fallback warning)
2. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### CORS errors

1. Verify `NEXT_PUBLIC_APP_DOMAIN` is set correctly
2. Check subdomain matches pattern `*.yourdomain.com`

## Support

For issues, check:
1. Vercel deployment logs
2. Sentry error dashboard
3. Application logs

---

Last updated: 2025-12-30
