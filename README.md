# SME++ - Business Management Platform for SMBs

A comprehensive multi-tenant SaaS platform for managing business operations including assets, HR, subscriptions, suppliers, and more. Built for small and medium businesses.

## Features

- **Asset Management** - Track hardware, equipment, warranties, and assignments
- **HR Management** - Employee profiles, leave requests, and payroll
- **Subscription Tracking** - Monitor SaaS/services, renewals, and costs
- **Supplier Management** - Vendor registration and engagement tracking
- **Purchase Requests** - Internal procurement with approval workflows
- **Multi-Level Approvals** - Configurable approval chains for all request types
- **Team Management** - Invite team members, assign roles
- **Reports & Analytics** - Excel exports, usage reports, cost analysis

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Authentication:** NextAuth.js (Google, Microsoft, Credentials)
- **File Storage:** Supabase Storage
- **Billing:** Stripe (coming soon)
- **UI Components:** shadcn/ui

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)
- Google/Microsoft OAuth apps (for social login)

### Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd smepp
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your database and auth credentials in `.env.local`.

3. **Setup database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

### Development Mode

Enable development auth with test users:
```env
DEV_AUTH_ENABLED=true
```

Test accounts:
- `admin@test.local` / `admin123`
- `employee@test.local` / `employee123`

## Project Structure

```
smepp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   ├── employee/          # Employee self-service
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── domains/          # Feature components
│   │   └── layout/           # Layout components
│   └── lib/                   # Utilities & business logic
│       ├── core/             # Core utilities
│       ├── domains/          # Domain logic
│       └── validations/      # Zod schemas
├── prisma/
│   └── schema.prisma          # Database schema
└── tests/                     # Test files
```

## Multi-Tenant Architecture

SME++ uses a shared database with tenant isolation:

- Every organization is a tenant
- All data is scoped by `tenantId`
- Automatic query filtering via Prisma extension
- Role-based access within organizations

## Subscription Tiers

| Tier | Users | Assets | Modules |
|------|-------|--------|---------|
| Free | 5 | 50 | Core modules |
| Starter | 15 | 200 | + HR, Leave |
| Professional | 50 | 1000 | All modules |
| Enterprise | Unlimited | Unlimited | All + Support |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # Type checking
npm run lint         # Linting
npm test             # Run tests
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## License

Proprietary - All rights reserved.
