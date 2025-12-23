# Scripts Directory

This directory contains utility scripts for managing and maintaining the DAMP application.

## Directory Structure

```
scripts/
├── backup/          # Database and file backup utilities
├── cron/            # Scheduled task scripts
├── dev/             # Development and testing utilities
└── ops/             # Operational maintenance scripts
```

## Backup Scripts (`backup/`)

### `database.ts`
Creates a backup of the PostgreSQL database.

**Usage:**
```bash
npx tsx scripts/backup/database.ts
```

### `files.ts`
Backs up files from Supabase storage.

**Usage:**
```bash
npx tsx scripts/backup/files.ts
```

### `full-backup.ts`
Creates a complete backup including both database and files.

**Usage:**
```bash
npx tsx scripts/backup/full-backup.ts
```

---

## Cron Scripts (`cron/`)

These scripts are designed to run on a schedule (e.g., daily, weekly).

### `subscriptionRenewalAlerts.ts`
Sends email alerts for upcoming subscription renewals.

**Schedule:** Daily
**Usage:**
```bash
npm run cron:subs
```

### `warrantyAlerts.ts`
Sends email alerts for expiring asset warranties.

**Schedule:** Daily
**Usage:**
```bash
npm run cron:warranty
```

---

## Development Scripts (`dev/`)

### `check-accreditations.ts`
Validates accreditation data integrity.

### `pre-deployment-check.ts`
Runs pre-deployment checks including:
- Database connectivity
- Environment variable validation
- API health checks
- Storage connectivity

**Usage:**
```bash
npx tsx scripts/dev/pre-deployment-check.ts
```

### `quick-start.ts`
Quick setup script for local development.

### `run-all-tests.ts`
Executes all test suites (unit, integration, e2e).

**Usage:**
```bash
npx tsx scripts/dev/run-all-tests.ts
```

### `run-role-migration.ts`
Migrates user roles (one-time migration helper).

### `setup-storage.ts`
Sets up Supabase storage buckets and policies.

**Usage:**
```bash
npx tsx scripts/dev/setup-storage.ts
```

---

## Operational Scripts (`ops/`)

### `purgeOldActivity.ts`
Purges old activity logs based on retention policy.

**Usage:**
```bash
npx tsx scripts/ops/purgeOldActivity.ts
```

**Retention:** Default 365 days (configurable via `ACTIVITY_RETENTION_DAYS` env var)

---

## Running Scripts

Most scripts can be run using `npx tsx`:

```bash
npx tsx scripts/[category]/[script-name].ts
```

Some scripts have npm shortcuts defined in `package.json`:

```bash
npm run cron:subs           # Subscription renewal alerts
npm run cron:warranty       # Warranty expiration alerts
```

---

## Environment Requirements

Scripts require the following environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SMTP_*` - Email configuration (for cron scripts)

See `.env.example` for complete list of required variables.

---

## Notes

- Backup scripts should be run before major updates or migrations
- Cron scripts are intended to run automated (via cron, GitHub Actions, etc.)
- Dev scripts are for local development and testing
- Ops scripts are for production maintenance

---

**Last Updated:** v1.0.0
