# Troubleshooting Guide

Common issues and solutions for Durj platform development and deployment.

## Table of Contents
- [Development Issues](#development-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Deployment Issues](#deployment-issues)
- [Multi-Tenant Issues](#multi-tenant-issues)
- [Module System Issues](#module-system-issues)

---

## Development Issues

### `npm run dev` fails to start

**Symptoms**: Development server crashes or fails to start

**Common causes and fixes**:

1. **Missing environment variables**
   ```bash
   # Check if .env.local exists
   ls -la .env.local

   # Copy from example if missing
   cp .env.example .env.local
   ```

2. **Port already in use**
   ```bash
   # Find process using port 3000
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                  # Mac/Linux

   # Kill the process or use different port
   PORT=3001 npm run dev
   ```

3. **Prisma client not generated**
   ```bash
   npm run db:generate
   ```

### TypeScript errors after pulling changes

**Fix**: Regenerate Prisma client and restart TypeScript server
```bash
npm run db:generate
# In VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Hot reload not working

**Causes**:
- Too many files being watched
- Turbopack issues

**Fixes**:
1. Increase file watchers (Linux/Mac):
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## Database Issues

### "Cannot connect to database" error

1. **Check DATABASE_URL format**:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
   ```

2. **For Supabase connections**:
   - Use `pooler.supabase.com` for serverless (port 6543)
   - Use `db.PROJECT.supabase.co` for direct connections (port 5432)

3. **Test connection**:
   ```bash
   npx prisma db pull
   ```

### Prisma migration conflicts

**Symptoms**: `Migration failed` or schema drift errors

**Fix**:
```bash
# Reset development database (WARNING: deletes all data)
npx prisma migrate reset

# Or sync without migrations (for development)
npx prisma db push
```

### "Record not found" after migration

**Cause**: Foreign key constraints or missing seed data

**Fix**:
```bash
npm run db:seed
```

---

## Authentication Issues

### OAuth redirect errors

1. **"redirect_uri_mismatch"**
   - Check OAuth app settings in Google/Microsoft console
   - Ensure callback URLs match exactly:
     - Google: `{APP_URL}/api/auth/callback/google`
     - Azure: `{APP_URL}/api/auth/callback/azure-ad`

2. **NEXTAUTH_URL mismatch**
   - Set `NEXTAUTH_URL` to match your deployment URL exactly
   - Include protocol (https://)

### Session not persisting

1. **Check NEXTAUTH_SECRET**:
   - Must be same across all instances
   - Generate secure secret: `openssl rand -base64 32`

2. **Cookie issues**:
   - Ensure same domain for all subdomains
   - Check `secureCookie` setting in production

### "User not found in organization"

**Cause**: User session has stale organization data

**Fix**: Clear session and re-login
```typescript
// Force session refresh
signOut({ callbackUrl: '/login' });
```

---

## Deployment Issues

### Vercel build fails

1. **Memory issues**:
   ```json
   // vercel.json
   {
     "functions": {
       "src/**/*.ts": {
         "memory": 1024
       }
     }
   }
   ```

2. **Missing environment variables**:
   - Check Vercel project settings
   - Ensure all required vars are set for Production/Preview

3. **Prisma generation**:
   - Add to build command: `prisma generate && next build`

### API routes returning 500 errors

1. **Check Vercel function logs**:
   ```bash
   npx vercel logs [deployment-url]
   ```

2. **Common causes**:
   - Missing environment variables
   - Database connection limits exceeded
   - Timeout (increase in vercel.json)

### Static generation errors

**Symptoms**: "Error occurred prerendering page"

**Fix**: Mark dynamic pages with `export const dynamic = 'force-dynamic'`

---

## Multi-Tenant Issues

### Data leaking between tenants

**CRITICAL**: This should never happen. If it does:

1. Check all Prisma queries include `tenantId` filter
2. Verify middleware is setting correct headers
3. Check `createTenantPrismaClient` is being used

### Wrong tenant context

**Symptoms**: User sees wrong organization's data

**Debug**:
```typescript
// Add to API route temporarily
console.log('Tenant context:', {
  headerTenantId: request.headers.get('x-tenant-id'),
  sessionOrgId: session.user.organizationId,
});
```

### Subdomain routing issues

1. **Check middleware.ts** for subdomain extraction
2. **Local development**: Use `*.localhost:3000` or update hosts file
3. **Production**: Verify DNS wildcard is configured

---

## Module System Issues

### Module not accessible

**Symptoms**: "Module not enabled" error

**Fixes**:
1. Check organization's enabled modules:
   ```sql
   SELECT "enabledModules" FROM "Organization" WHERE id = 'ORG_ID';
   ```

2. Verify subscription tier allows module:
   - Check `MODULE_TIERS` in `src/middleware.ts`

### Module routes not loading

1. Check route is registered in `src/lib/modules/registry.ts`
2. Verify path matches exactly (case-sensitive)

---

## Performance Issues

### Slow API responses

1. **Database queries**:
   ```typescript
   // Enable Prisma query logging
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   });
   ```

2. **Add indexes** for frequently queried fields:
   ```prisma
   model Asset {
     @@index([tenantId, status])
     @@index([tenantId, assignedUserId])
   }
   ```

### Memory leaks in development

**Symptoms**: Node process growing in memory

**Fix**: Restart dev server periodically or use:
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run dev
```

---

## Getting Help

1. **Check logs**: Vercel dashboard or local console
2. **Search codebase**: Use grep/find for error messages
3. **Review recent changes**: `git log --oneline -20`
4. **Contact team**: Create issue with reproduction steps

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes (dev) |
| `npx prisma studio` | Open database GUI |
| `rm -rf .next && npm run dev` | Clear cache and restart |
| `npx vercel logs [url]` | View deployment logs |
| `npm run typecheck` | Check for TypeScript errors |
