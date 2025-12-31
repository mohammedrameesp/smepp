# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Durj** is a multi-tenant SaaS platform for business management, targeting small and medium businesses. It provides comprehensive asset management, HR, operations, and project management capabilities.

**Key Differentiators from internal tools:**
- Multi-tenant architecture with tenant isolation
- Self-service signup and onboarding
- Freemium billing model with Stripe integration
- Social authentication (Google, Microsoft) + email/password
- Organization-scoped data access

Built with Next.js 15 App Router, React 19, TypeScript, Prisma ORM, and PostgreSQL.

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production (includes Prisma generate + migrate)
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:seed          # Seed database
npx prisma format        # Format schema.prisma

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:unit        # Unit tests only (tests/unit)
npm run test:security    # Security-focused tests (tests/security)
npm run test:api         # Integration/API tests (tests/integration)
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Playwright with interactive UI
npm run test:e2e:headed  # Playwright with visible browser
npm run test:e2e:debug   # Playwright debug mode
npm run test:all         # Run all tests (unit + E2E)
```

## Test Organization

Tests live in `tests/` directory (not alongside source files):
- `tests/unit/` - Unit tests for utilities and business logic
- `tests/integration/` - API integration tests
- `tests/security/` - Security-focused tests
- `tests/e2e/` - Playwright E2E tests

## Multi-Tenant Architecture

### Tenant Model

Every business using Durj is an **Organization** (tenant). Data is isolated using a `tenantId` column on all business entities.

```prisma
model Organization {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  subscriptionTier  SubscriptionTier @default(FREE)
  stripeCustomerId  String?  @unique
  // ... settings, limits
}

model OrganizationUser {
  organizationId  String
  userId          String
  role            OrgRole  @default(MEMBER)
  isOwner         Boolean  @default(false)
  @@unique([organizationId, userId])
}
```

### Subscription Tiers

| Tier | Users | Assets | Modules | Price |
|------|-------|--------|---------|-------|
| FREE | 5 | 50 | Assets, Subscriptions, Suppliers | $0 |
| STARTER | 15 | 200 | + Employees, Leave | $29/mo |
| PROFESSIONAL | 50 | 1000 | All modules | $99/mo |
| ENTERPRISE | Unlimited | Unlimited | All + Priority support | Custom |

Feature flags: `src/lib/multi-tenant/feature-flags.ts`

### Subdomain Routing

Each organization gets a subdomain: `{org-slug}.durj.com` (or `{org-slug}.localhost` in dev).

The middleware (`src/middleware.ts`) handles:
1. Subdomain extraction and validation
2. Redirect to correct subdomain if user accesses wrong one
3. Injection of tenant headers (`x-tenant-id`, `x-tenant-slug`, etc.)

### Tenant Context

The tenant context flows through the application:

1. **Middleware** (`src/middleware.ts`) extracts `organizationId` from session and sets headers
2. **Prisma Extension** (`src/lib/core/prisma-tenant.ts`) auto-filters all queries by `tenantId`
3. **API Handler** (`src/lib/http/handler.ts`) reads headers and injects tenant-scoped Prisma client

```typescript
// src/lib/core/prisma-tenant.ts
export function createTenantPrismaClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
      },
    },
  });
}
```

## Authentication

### Providers

- **Google OAuth** - Primary social login
- **Microsoft/Azure AD** - Enterprise customers
- **Email/Password** - Credentials provider with verification

Configuration: `src/lib/core/auth.ts`

### Custom OAuth (Per-Organization)

Organizations can configure their own OAuth apps instead of platform defaults:
- `src/lib/oauth/utils.ts` - Encryption, state management, session creation
- `src/lib/oauth/google.ts` - Google OAuth helpers
- `src/lib/oauth/azure.ts` - Azure AD OAuth helpers
- `src/app/api/auth/oauth/google/` - Custom Google OAuth routes
- `src/app/api/auth/oauth/azure/` - Custom Azure OAuth routes

Login page checks `hasCustomGoogleOAuth`/`hasCustomAzureOAuth` flags before showing OAuth buttons on tenant subdomains.

### Session Structure

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organizationSlug: string;
    orgRole: OrgRole; // OWNER, ADMIN, MANAGER, MEMBER
    subscriptionTier: SubscriptionTier;
  };
}
```

### User Flows

- `/signup` - Create account + create organization
- `/login` - Multi-provider login
- `/invite/[token]` - Join existing organization via invite
- `/onboarding` - Post-signup setup wizard

## Super Admin System

The platform includes a super admin layer for platform-wide management:

- `/super-admin/login` - Login with 2FA verification
- `/super-admin/*` - Platform management routes (organizations, users, settings)
- **Impersonation**: Super admins can access tenant orgs via signed JWT tokens
- Middleware validates `isSuperAdmin` flag from session for protected routes

Key files:
- `src/app/super-admin/` - Super admin UI pages
- `src/app/api/super-admin/` - Super admin API routes
- `src/middleware.ts` - Impersonation token verification

## Module System

Modules are the feature units that can be enabled/disabled per organization.

### Registry

Central definition in `src/lib/modules/registry.ts`:
- Each module defines: routes (admin/employee/API), tier requirements, dependencies
- Categories: `operations`, `hr`, `projects`, `system`
- Default enabled for new orgs: `['assets', 'subscriptions', 'suppliers']`

### Access Control

1. **Middleware level** (`src/middleware.ts`): Blocks routes for disabled modules
2. **API level** (`src/lib/http/handler.ts`): `requireModule` option for per-endpoint checks

```typescript
// API route requiring a specific module
export const GET = withErrorHandler(async (request, { prisma }) => {
  const loans = await prisma.loan.findMany();
  return NextResponse.json(loans);
}, { requireAuth: true, requireModule: 'payroll' });
```

### Module Dependencies

Some modules depend on others (e.g., `leave` requires `employees`). The registry tracks these via `requires` and `requiredBy` fields.

## Domain Organization

The codebase is organized by business domain:

| Domain | Modules | Description |
|--------|---------|-------------|
| **HR** | Employees, Leave, Payroll | Human resources, leave management, payroll processing |
| **Operations** | Assets, Subscriptions, Suppliers | Physical/digital assets, SaaS tracking, vendor management |
| **Projects** | Tasks, Purchase Requests | Kanban boards, procurement |
| **System** | Users, Settings, Reports, Billing | Administration and configuration |

### Route Structure

```
src/app/
├── (marketing)/             # Public landing, pricing
│   ├── page.tsx            # Landing page
│   ├── pricing/
│   └── features/
├── (auth)/                  # Authentication
│   ├── login/
│   ├── signup/
│   └── invite/[token]/
├── onboarding/              # Post-signup wizard
├── admin/                   # Admin dashboard
│   ├── (hr)/
│   ├── (operations)/
│   ├── (projects)/
│   └── (system)/
│       └── billing/        # Subscription management
├── employee/                # Employee self-service
└── api/                     # API routes
```

## Billing Integration (Stripe)

> **Note:** Stripe billing is planned but not yet fully implemented. The schema supports it but checkout/webhooks are missing.

### Usage Limits

Enforced at API level:

```typescript
// src/lib/multi-tenant/limits.ts
export async function checkLimit(tenantId: string, resource: 'users' | 'assets') {
  const org = await prisma.organization.findUnique({ where: { id: tenantId } });
  const limits = TIER_LIMITS[org.subscriptionTier];
  // ... check current usage vs limit
}
```

## API Pattern

All API routes use the `withErrorHandler` wrapper from `src/lib/http/handler.ts`:

```typescript
export const GET = withErrorHandler(async (request, { prisma, tenant, params }) => {
  // prisma is already tenant-scoped
  // tenant contains: tenantId, tenantSlug, userId, userRole, orgRole, subscriptionTier
  const assets = await prisma.asset.findMany();
  return NextResponse.json(assets);
}, { requireAuth: true });
```

### Handler Options

| Option | Description |
|--------|-------------|
| `requireAuth` | Require authenticated session |
| `requireAdmin` | Require ADMIN role |
| `requireTenant` | Require tenant context (default: true when auth required) |
| `requireModule` | Require specific module to be enabled (e.g., `'payroll'`) |
| `rateLimit` | Enable rate limiting for this endpoint |
| `skipLogging` | Disable request logging |

## Key Libraries

- **Prisma** - Database ORM with tenant extension
- **Stripe** - Billing and subscriptions
- **NextAuth.js** - Multi-provider authentication
- **Zod** - Runtime validation
- **shadcn/ui** - UI components
- **Supabase** - File storage

## Database Schema Notes

### Multi-Tenant Models

All business entities include:
```prisma
model Asset {
  id        String @id @default(cuid())
  tenantId  String
  tenant    Organization @relation(fields: [tenantId], references: [id])
  // ... other fields

  @@index([tenantId])
}
```

### Key Models

- `Organization` - Tenant with settings and billing
- `OrganizationUser` - User membership in organizations
- `OrganizationInvitation` - Pending team invites
- `User` - Global user profile (can belong to multiple orgs)
- `Asset`, `Subscription`, `Supplier` - Core business entities
- `LeaveType`, `LeaveBalance`, `LeaveRequest` - HR module
- `PayrollRun`, `Payslip` - Payroll module

## Environment Variables

See `.env.example` for full list. Key variables:

```env
# Database
DATABASE_URL=
DIRECT_URL=

# Auth
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Security Considerations

### Tenant Isolation

- **Query filtering**: All database queries filtered by `tenantId`
- **IDOR prevention**: Entity access validated against tenant
- **Cross-tenant blocking**: Middleware rejects cross-tenant requests

### Rate Limiting

Token bucket algorithm per tenant: `src/lib/security/rateLimit.ts`

### File Storage

Tenant-scoped buckets in Supabase with signed URLs.

## Notification System

- `src/lib/domains/system/notifications/notification-service.ts` - Core notification service
- Templates for: leave requests, asset assignments, purchase requests, document expiry
- In-app notifications only (bell icon) - no email/push notifications yet
- Notifications are non-blocking (fire and forget)

## Scheduled Jobs (Vercel Cron)

Configured in `vercel.json`. Cron auth uses `CRON_SECRET` bearer token.

| Job | Schedule | Description |
|-----|----------|-------------|
| `/api/super-admin/backups/cron` | Daily 1 AM UTC | Full platform + per-org backups |

Manual cron scripts available via npm:
```bash
npm run cron:subs              # Subscription renewal alerts
npm run cron:warranty          # Warranty expiry alerts
npm run cron:employee-expiry   # Employee document expiry alerts
npm run cron:company-docs      # Company document expiry alerts
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Auth | DEV_AUTH_ENABLED for test users | Real OAuth providers |
| Database | Local PostgreSQL or SQLite | Supabase PostgreSQL |
| Stripe | Test mode keys | Live keys |
| Storage | Local or Supabase dev | Supabase production |

## Component Patterns

### Tenant-Aware Components

```tsx
// Server component with tenant context
async function AssetList() {
  const session = await getServerSession(authOptions);
  const assets = await getTenantPrisma(session.user.organizationId)
    .asset.findMany();
  return <AssetTable assets={assets} />;
}
```

### Feature Gates

```tsx
import { useFeatureAccess } from '@/hooks/use-feature-access';

function PayrollModule() {
  const { hasAccess, tier } = useFeatureAccess('payroll');

  if (!hasAccess) {
    return <UpgradePrompt feature="payroll" currentTier={tier} />;
  }

  return <PayrollDashboard />;
}
```

## Onboarding Flow

1. User signs up (creates account)
2. User creates organization (name, slug)
3. Onboarding wizard:
   - Company details (timezone, currency)
   - Invite team members
   - Select enabled modules
   - Optional data import
4. Redirect to dashboard
