# Safe Production Deployment Guide

## Pre-Deployment Checklist

### 1. Backup Production Database (REQUIRED)
```bash
# Using Supabase Dashboard:
# Go to Project Settings > Database > Backups > Create Backup

# Or using pg_dump:
pg_dump -h your-host.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test Migration Locally First
```bash
# Create a copy of production database URL for testing
DATABASE_URL="your-staging-url" npx prisma db push --accept-data-loss=false
```

## Deployment Steps

### Step 1: Deploy Code (without DB changes)
Deploy the new code to Vercel/production first.

### Step 2: Apply Database Changes
```bash
# This only ADDS new tables, doesn't modify existing ones
npx prisma db push
```

This command will:
- ✅ CREATE TABLE "HRProfile" (new)
- ✅ CREATE TABLE "ProfileChangeRequest" (new)
- ✅ CREATE TYPE "ProfileChangeRequestStatus" (new enum)
- ❌ Will NOT modify: User, Asset, Subscription, Supplier tables

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```

### Step 4: Verify
```bash
# Check tables were created
npx prisma db pull
```

## What Happens to Existing Users

| Scenario | Result |
|----------|--------|
| User logs in | Works normally |
| User visits /profile | HRProfile created automatically (empty) |
| User has assets/subscriptions | Unchanged, still linked |
| Admin views employees | Shows "Not Started" for onboarding |

## Rollback Plan (if needed)

The new tables are independent. To rollback:
```sql
-- Only if needed - removes HR module entirely
DROP TABLE IF EXISTS "ProfileChangeRequest";
DROP TABLE IF EXISTS "HRProfile";
DROP TYPE IF EXISTS "ProfileChangeRequestStatus";
```

## Environment Variables Needed

Add these to production:
```env
RESEND_API_KEY=re_xxxxx  # For email notifications
```
