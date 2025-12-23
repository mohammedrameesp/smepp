# Deployment Guide

This guide covers deploying the Digital Asset & Subscription Manager to production.

## Prerequisites

- PostgreSQL database (Supabase recommended)
- Supabase account for file storage
- Azure AD app registration
- Vercel account (recommended) or any Node.js hosting

## Quick Deployment Checklist

### 1. Database Setup (Supabase)

1. Create a new project at [Supabase](https://supabase.com)
2. Navigate to **Settings → Database**
3. Copy the **Connection Pooling** string (Transaction mode)
4. Update your `DATABASE_URL` environment variable

### 2. Storage Setup (Supabase)

1. Navigate to **Storage** in Supabase dashboard
2. Create private bucket:
   - `accreditation-photos` - for accreditation profile photos
3. Set bucket to **Private** (not public)
4. Copy **Project URL** and **Service Role Key** from Settings → API

### 3. Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. Navigate to **App registrations** → New registration
3. Configure:
   - Name: "DAMP Production"
   - Redirect URI: `https://your-domain.com/api/auth/callback/azure-ad`
4. Copy **Application (client) ID**, **Directory (tenant) ID**
5. Create a new **Client Secret** and copy it immediately

### 4. Environment Variables

Create these environment variables in your hosting platform:

```env
# Database (Supabase Connection Pooling - Transaction mode)
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Authentication
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="https://your-domain.com"

# Azure AD
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"

# Supabase Storage
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ACTIVITY_RETENTION_DAYS=365
```

### 5. Deploy to Vercel

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

2. **Or use Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Configure environment variables
   - Deploy

3. **Post-Deployment:**
   - Run database migrations automatically (configured in `package.json`)
   - Verify deployment at health endpoint: `https://your-domain.com/api/health`

### 6. Run Database Migrations

Migrations run automatically during build. To run manually:

```bash
# From Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

### 7. Create First Admin User

After deployment, you need to manually set the first admin:

```sql
-- Connect to your Supabase database via SQL Editor
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-email@company.com';
```

## Deployment Platforms

### Vercel (Recommended)

**Pros:**
- Automatic builds from Git
- Built-in preview deployments
- Excellent Next.js optimization
- Free SSL certificates

**Configuration:**
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Framework Preset: Next.js

### Railway / Render

Both support Next.js. Similar configuration:

```toml
# Railway/Render configuration
[build]
  command = "npm install && npm run build"

[start]
  command = "npm run start"
```

## Post-Deployment Setup

### 1. Configure Azure AD Redirect URI

Update your Azure AD app registration with the production URL:
- Redirect URI: `https://your-domain.com/api/auth/callback/azure-ad`

### 2. Test Authentication

1. Visit `https://your-domain.com`
2. Sign in with Azure AD
3. Verify you're redirected correctly

### 3. Configure Branding (Admin)

1. Sign in as admin
2. Navigate to **Admin → Settings**
3. Configure:
   - Company name
   - Logo URL
   - Primary/Secondary colors

### 4. Set Up Cron Jobs (Optional)

Configure automated tasks in your hosting platform:

**Subscription Renewal Alerts:**
```bash
# Run daily at 9 AM
0 9 * * * npm run cron:subs
```

**Warranty Expiration Alerts:**
```bash
# Run daily at 9 AM
0 9 * * * npm run cron:warranty
```

**Activity Log Cleanup:**
```bash
# Run weekly on Sunday at 2 AM
0 2 * * 0 npm run ops:purge-activity
```

## Database Connection Modes

Supabase provides two connection strings:

1. **Session Mode** (Port 5432):
   - Direct connection
   - Use for long-running operations
   - Use for `DIRECT_URL`

2. **Transaction Mode** (Port 6543):
   - Connection pooling
   - Use for serverless (Vercel)
   - Use for `DATABASE_URL`

**Configuration:**
```env
# Transaction mode - for API routes
DATABASE_URL="...pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session mode - for migrations
DIRECT_URL="...pooler.supabase.com:5432/postgres"
```

## Troubleshooting

### Database Connection Errors

**Error:** "prepared statement already exists"

**Solution:** Ensure `pgbouncer=true` is in your `DATABASE_URL`

```env
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

### Migration Failures

**Error:** "Migration failed to apply"

**Solution:** Run migrations manually:

```bash
npx prisma migrate deploy
```

### Storage Upload Failures

**Error:** "Storage bucket not found"

**Solution:** Verify bucket names match exactly:
- `invoices`
- `asset-photos`
- `warranties`

All buckets must be set to **Private** in Supabase.

### Authentication Issues

**Error:** "Sign in failed"

**Solution:** Check:
1. `NEXTAUTH_URL` matches your domain exactly
2. Azure AD redirect URI is configured correctly
3. `NEXTAUTH_SECRET` is set and properly encoded

## Health Monitoring

### Health Check Endpoint

```bash
curl https://your-domain.com/api/health
```

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "connected": true,
    "latency": 45
  },
  "storage": {
    "accessible": true
  },
  "version": "1.0.0",
  "uptime": 86400
}
```

**Degraded Response (503):**
```json
{
  "status": "degraded",
  "database": {
    "connected": false,
    "error": "Connection timeout"
  }
}
```

### Monitoring Recommendations

1. **Set up alerts** for 5xx errors
2. **Monitor health endpoint** every 5 minutes
3. **Track response times** for API routes
4. **Monitor database connection pool** usage
5. **Set up log aggregation** (Vercel provides this built-in)

## Security Checklist

- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Environment variables stored securely
- [ ] Database connection uses SSL
- [ ] Supabase buckets set to Private
- [ ] Rate limiting configured
- [ ] NEXTAUTH_SECRET is strong (32+ characters)
- [ ] Azure AD redirect URI matches exactly
- [ ] Admin role assigned to appropriate users
- [ ] Activity logging enabled
- [ ] File upload validation active

## Backup Strategy

### Database Backups

**Automated (Supabase):**
- Daily automatic backups
- Point-in-time recovery available
- Configure under Project Settings → Database → Backup

**Manual Backups:**
```bash
npm run backup:db create
```

### File Backups

**Manual Inventory:**
```bash
npm run backup:files inventory
```

**Download All Files:**
```bash
npm run backup:files download "*.pdf"
```

## Performance Optimization

### Recommended Vercel Settings

- **Function Region:** Match your Supabase region
- **Node.js Version:** 18.x or later
- **Output File Tracing:** Enabled (default)
- **Image Optimization:** Enabled (default)

### Caching Strategy

Vercel automatically caches:
- Static files (CSS, JS, images)
- API routes with proper headers
- Page components

## Scaling Considerations

### Database

- Monitor connection pool usage
- Upgrade Supabase plan if needed
- Consider read replicas for reporting

### Serverless Functions

- Monitor function execution time
- Optimize slow API routes
- Consider edge functions for latency-sensitive operations

### File Storage

- Monitor storage usage in Supabase
- Implement file size limits
- Consider CDN for frequently accessed files

## Support

For issues:
1. Check health endpoint: `/api/health`
2. Review application logs in Vercel dashboard
3. Check Supabase logs for database issues
4. Verify all environment variables are set

---

**Quick Reference:**

- Database: Supabase PostgreSQL
- Storage: Supabase Storage (Private buckets)
- Auth: NextAuth.js + Azure AD
- Hosting: Vercel (recommended)
- Health Check: `/api/health`
