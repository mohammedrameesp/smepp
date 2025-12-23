# DAMP - Digital Asset Management Platform
## Technical Brief & Architecture Documentation

**Version:** 1.0
**Last Updated:** January 2025
**Project Name:** DAMP (Digital Asset & Subscription Manager)

---

## Executive Summary

DAMP is a comprehensive enterprise-grade web application designed to manage digital assets, subscriptions, suppliers, and related business operations. Built on modern web technologies, it provides a secure, scalable, and user-friendly platform for organizations to track their IT assets, subscriptions, warranties, and vendor relationships.

### Key Objectives
- Centralized asset and subscription lifecycle management
- Automated alerts for renewals and warranty expirations
- Supplier onboarding and relationship management
- Role-based access control for multi-user environments
- Comprehensive audit trail and activity logging
- Secure document storage and management

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (Browser)                  │
│  Next.js 15 + React 19 + TypeScript + Tailwind CSS         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────┴───────────────────────────────────────┐
│                   Application Layer                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Next.js API │  │  Middleware  │  │   NextAuth   │       │
│  │   Routes    │  │   Security   │  │ (Azure AD)   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼─────────┐ ┌─▼──────────────┐
│  PostgreSQL  │ │   Supabase  │ │   Azure AD     │
│   Database   │ │   Storage   │ │  (Identity)    │
└──────────────┘ └─────────────┘ └────────────────┘
```

### Application Architecture Pattern
- **Pattern:** Server-Side Rendered (SSR) with API Routes
- **Routing:** Next.js App Router (file-based)
- **State Management:** React Server Components + Client Components
- **Data Fetching:** Server-side with Prisma ORM
- **Authentication:** Session-based with NextAuth.js

---

## Technology Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.5 | React framework with SSR & App Router |
| React | 19.1.0 | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| shadcn/ui | Latest | Pre-built accessible components |
| Lucide React | 0.545.0 | Icon library |
| Sonner | 2.0.7 | Toast notifications |
| React Day Picker | 8.10.1 | Date selection component |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 15.5.5 | RESTful API endpoints |
| Prisma | 6.17.1 | ORM for database operations |
| PostgreSQL | Latest | Primary database |
| Zod | 4.1.12 | Schema validation |
| NextAuth.js | 4.24.11 | Authentication framework |

### Infrastructure & Services
| Service | Purpose |
|---------|---------|
| Supabase Storage | Private file storage (invoices, documents) |
| Azure AD | Enterprise SSO authentication |
| Nodemailer | Email notifications |
| Pino | Structured logging |

### Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| tsx | TypeScript execution |
| Turbopack | Fast development builds |

---

## Database Schema

### Core Models

#### Users & Authentication
```prisma
User {
  - id: String (CUID)
  - name, email, image
  - role: ADMIN | EMPLOYEE
  - isTemporaryStaff: Boolean
  - isSystemAccount: Boolean
  Relations: assets, subscriptions, activityLogs
}
```

#### Asset Management
```prisma
Asset {
  - assetTag: String (unique identifier)
  - type, category, brand, model, serial
  - configuration, purchaseDate, warrantyExpiry
  - supplier, invoiceNumber
  - assignedUser, status, acquisitionType
  - price, location, notes
  Relations: history, maintenanceRecords
}

AssetStatus: IN_USE | SPARE | REPAIR | DISPOSED
AcquisitionType: NEW_PURCHASE | TRANSFERRED
```

#### Subscription Management
```prisma
Subscription {
  - serviceName, category, accountId
  - purchaseDate, renewalDate, billingCycle
  - costPerCycle, vendor, paymentMethod
  - assignedUser, project
  - status, autoRenew, notes
  Relations: history
}

BillingCycle: MONTHLY | YEARLY | ONE_TIME
SubscriptionStatus: ACTIVE | PAUSED | CANCELLED
```

#### Supplier Management
```prisma
Supplier {
  - suppCode: String (auto-generated SUPP-XXXX)
  - name, category, address, country
  - website, establishmentYear
  - primaryContact (name, title, email, mobile)
  - secondaryContact (name, title, email, mobile)
  - paymentTerms, additionalInfo
  - status: PENDING | APPROVED | REJECTED
  Relations: engagements, approvedBy
}
```

#### Project Organization
```prisma
Project {
  - name, code (unique)
  - isActive: Boolean
  Relations: assets, subscriptions
}
```

#### Audit & Logging
```prisma
ActivityLog {
  - actorUser, action, entityType, entityId
  - payload: JSON
  - timestamp
}

AssetHistory {
  - action: ASSIGNED | UNASSIGNED | STATUS_CHANGED | etc.
  - fromUser, toUser, fromStatus, toStatus
  - notes, performedBy, dates
}

SubscriptionHistory {
  - action: CREATED | REACTIVATED | CANCELLED | RENEWED
  - oldStatus, newStatus, oldRenewalDate, newRenewalDate
  - oldUser, newUser, notes
}
```

### Database Indexes
Optimized indexes on:
- `Asset.warrantyExpiry`, `Asset.projectId`, `Asset.brand`
- `Subscription.renewalDate`, `Subscription.status`, `Subscription.category`
- `Supplier.status`, `Supplier.suppCode`, `Supplier.createdAt`
- `ActivityLog.actorUserId`, `ActivityLog.at`

---

## Key Features & Modules

### 1. Asset Management
**Location:** `/admin/assets`, `/dashboard/assets`

**Features:**
- Complete asset lifecycle tracking (purchase → assignment → maintenance → disposal)
- Warranty expiration monitoring
- Assignment history with dates
- Maintenance record tracking
- CSV/Excel import for bulk uploads
- Excel export for reporting
- Advanced filtering and search

**APIs:**
- `GET/POST /api/assets` - List and create assets
- `GET/PUT/DELETE /api/assets/[id]` - Single asset operations
- `POST /api/assets/import` - CSV import
- `GET /api/assets/export` - Excel export

### 2. Subscription Management
**Location:** `/admin/subscriptions`, `/dashboard/subscriptions`

**Features:**
- Subscription lifecycle tracking (active → paused → cancelled → reactivated)
- Automatic renewal date calculations
- Cost tracking with currency conversion (QAR)
- Payment method tracking
- Renewal alerts (30/60/90 days)
- History tracking for all changes

**APIs:**
- `GET/POST /api/subscriptions` - List and create subscriptions
- `GET/PUT/DELETE /api/subscriptions/[id]` - Single subscription operations
- `POST /api/subscriptions/[id]/cancel` - Cancel subscription
- `POST /api/subscriptions/[id]/reactivate` - Reactivate subscription

### 3. Supplier Management
**Location:** `/suppliers/register`, `/admin/suppliers`

**Features:**
- Public supplier registration form
- Three-stage approval workflow (PENDING → APPROVED/REJECTED)
- Auto-generated supplier codes (SUPP-0001, SUPP-0002, etc.)
- Engagement tracking with ratings
- Category autocomplete from existing suppliers
- Comprehensive contact management (primary & secondary)
- Additional information field for portfolios/certifications
- Country dropdown with Qatar pre-selected
- Mobile number with country code selector (+974 default)

**APIs:**
- `POST /api/suppliers/register` - Public registration (rate-limited)
- `GET /api/suppliers` - List suppliers (filtered by role)
- `GET/PUT/DELETE /api/suppliers/[id]` - Supplier operations
- `PATCH /api/suppliers/[id]/approve` - Approve supplier (Admin only)
- `PATCH /api/suppliers/[id]/reject` - Reject supplier (Admin only)
- `POST /api/suppliers/[id]/engagements` - Add engagement record

### 4. Project Management
**Location:** `/admin/projects`

**Features:**
- Project creation and management
- Unique project codes
- Asset and subscription assignment
- Active/inactive status

**APIs:**
- `GET/POST /api/projects` - List and create projects
- `GET/PUT /api/projects/[id]` - Project operations

### 5. File Management
**Location:** Various upload points

**Features:**
- Secure private file storage via Supabase
- File type validation (PDF, PNG, JPEG)
- Magic number verification
- Signed URL generation for secure downloads
- 24-hour URL expiration
- File organization by entity type

**APIs:**
- `POST /api/upload` - Upload files
- `POST /api/invoices/signed-url` - Generate download URLs

### 6. User Management
**Location:** `/admin/users`

**Features:**
- User role management (Admin, Employee)
- Temporary staff marking
- System account designation
- Access control enforcement

### 7. Activity Logging & Audit Trail
**Location:** `/admin/dashboard`, `/admin/suppliers/[id]`

**Features:**
- Comprehensive action logging
- Interactive activity popups with before/after comparisons
- Visual icons for different action types
- Actor, entity, and payload tracking
- Automatic retention policy (configurable)

**Recent Enhancement:**
- Activity popup shows user-friendly details
- Before/after value comparison for updates
- Clean, professional UI without technical codes

### 8. Reporting & Analytics
**Location:** `/admin/dashboard`, Export buttons

**Features:**
- Dashboard with key metrics
- Upcoming renewals with filters (week, month, 30/60/90 days)
- Recent activity feed
- Excel export for all major entities
- Cost analysis and summaries

### 9. System Settings
**Location:** `/admin/settings`

**Features:**
- Branding customization (logo, colors, company name)
- Configuration caching
- Global application theming

---

## Security Implementation

### Authentication & Authorization
**Provider:** NextAuth.js with Azure AD

**Implementation:**
```typescript
// Session-based authentication
- Cookie-based sessions
- Azure AD SSO integration
- Role-based access control (RBAC)
- Middleware protection on routes
```

**Access Control Levels:**
- **Public:** Supplier registration form
- **Authenticated:** Dashboard, basic asset/subscription views
- **Employee:** Read-only access to approved data
- **Admin:** Full CRUD operations, approvals, settings

### Security Middleware

#### 1. Rate Limiting
**Implementation:** Token bucket algorithm
```typescript
Default: 100 requests per 15 minutes per IP
Configurable via environment variables
Applied to: Supplier registration, sensitive APIs
```

#### 2. CSRF Protection
```typescript
- Signed tokens for form submissions
- Token validation on POST/PUT/DELETE requests
- Automatic token regeneration
```

#### 3. Input Validation
```typescript
- Zod schemas for all API inputs
- Type-safe request/response handling
- Sanitization of user inputs
```

#### 4. File Security
```typescript
- Magic number verification (prevents file type spoofing)
- MIME type validation
- File size limits
- Private bucket storage
- Signed URL with expiration
```

#### 5. Security Headers
```typescript
Content-Security-Policy (CSP)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security (HSTS)
Referrer-Policy: origin-when-cross-origin
```

### Data Protection
- Sensitive data in environment variables
- Database connection encryption
- Private file storage (no public access)
- Activity logging for audit compliance

---

## API Structure

### RESTful Design Principles
- Resource-based URLs (`/api/assets/[id]`)
- HTTP method semantics (GET, POST, PUT, DELETE, PATCH)
- JSON request/response format
- Consistent error handling

### Response Formats

**Success Response:**
```json
{
  "asset": { /* data */ },
  "message": "Asset created successfully"
}
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "timestamp": "2025-01-28T10:00:00.000Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Deployment Architecture

### Supported Platforms
- **Vercel** (Recommended for Next.js)
- **Railway** (PostgreSQL + App)
- **Heroku** (PostgreSQL + App)
- **Self-hosted** (Docker/VPS)

### Environment Configuration

#### Required Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/damp
DIRECT_URL=postgresql://user:pass@host:5432/damp  # For migrations

# Authentication
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://your-domain.com
AZURE_AD_CLIENT_ID=<azure-app-id>
AZURE_AD_CLIENT_SECRET=<azure-secret>
AZURE_AD_TENANT_ID=<azure-tenant-id>

# Storage
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

#### Optional Variables
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ACTIVITY_RETENTION_DAYS=365
BACKUP_DIR=./backups
```

### Deployment Steps (Vercel)

1. **Database Setup**
   ```bash
   # Create PostgreSQL database on Supabase/Railway/etc.
   # Add DATABASE_URL to environment
   ```

2. **Environment Configuration**
   ```bash
   # Add all required environment variables to Vercel
   ```

3. **Build Configuration**
   ```json
   {
     "buildCommand": "prisma generate && prisma migrate deploy && next build",
     "framework": "nextjs"
   }
   ```

4. **Deploy**
   ```bash
   # Push to GitHub
   # Vercel auto-deploys from main branch
   ```

### Post-Deployment

1. **Database Migration**
   ```bash
   npm run db:migrate:deploy
   ```

2. **Initial Data Seeding**
   ```bash
   npm run db:seed
   ```

3. **Verify Health**
   ```bash
   curl https://your-domain.com/api/health
   ```

---

## Performance Considerations

### Build Optimization
- **Turbopack:** Fast development builds (5x faster than Webpack)
- **React Server Components:** Reduced client-side JavaScript
- **Code Splitting:** Automatic route-based splitting
- **Image Optimization:** Next.js automatic optimization

### Database Optimization
- Strategic indexes on frequently queried fields
- Prisma query optimization
- Connection pooling (via DATABASE_URL with pooling)
- Selective field fetching (`select` clauses)

### Caching Strategy
- Branding settings cached (5-minute TTL)
- Static assets cached via CDN
- React Server Component caching

### Monitoring
- Structured logging with Pino
- Health check endpoint (`/api/health`)
- Activity log retention policy
- Database connection monitoring

---

## Maintenance & Operations

### Scheduled Tasks (Cron Jobs)

**Subscription Renewal Alerts**
```bash
npm run cron:subs
# Checks for subscriptions expiring in 30/60/90 days
# Sends email notifications
```

**Warranty Expiration Alerts**
```bash
npm run cron:warranty
# Checks for assets with expiring warranties
# Sends email notifications
```

**Activity Log Cleanup**
```bash
npm run ops:purge-activity
# Removes activity logs older than ACTIVITY_RETENTION_DAYS
```

### Backup Operations

**Database Backup**
```bash
npm run backup:db create      # Create backup
npm run backup:db list        # List backups
npm run backup:db cleanup 30  # Delete backups older than 30 days
```

**File Backup**
```bash
npm run backup:files inventory           # Create inventory
npm run backup:files list invoices       # List bucket files
npm run backup:files download "*.pdf"    # Download by pattern
```

**Full Backup**
```bash
npm run backup:full create    # Database + Files
npm run backup:full status    # Backup history
```

### Monitoring Commands
```bash
# Health check
curl https://your-domain.com/api/health

# Database status
npx prisma db pull

# Check logs
tail -f logs/application.log
```

---

## Development Workflow

### Local Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure `.env.local`
4. Run migrations: `npm run db:migrate`
5. Seed database: `npm run db:seed`
6. Start dev server: `npm run dev`

### Code Quality
```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint checks
npm run format       # Prettier formatting
```

### Testing Checklist
- [ ] Authentication flows
- [ ] CRUD operations for all entities
- [ ] File upload/download
- [ ] Rate limiting activation
- [ ] Role-based access control
- [ ] Activity logging
- [ ] Email notifications
- [ ] Backup scripts

---

## Recent Enhancements

### Supplier Module Improvements (January 2025)
1. **Country Dropdown:** Pre-selected Qatar for company address
2. **Mobile Number Enhancement:** Country code dropdown with flags (+974 Qatar default)
3. **Website Validation:** Accepts domains without http/https (e.g., example.qa)
4. **Additional Info Field:** Textarea for portfolio, certifications, specializations
5. **Single Page View:** Additional info now visible in supplier detail pages

### Dashboard Improvements
1. **Renewal Filters:** Dropdown for this week, this month, next month, 30/60/90 days
2. **Activity Popup:** Interactive detailed view with before/after comparisons
3. **Color Coding:** Payment method column in renewals table
4. **Visual Icons:** Activity types with color-coded icons

---

## Known Limitations & Future Considerations

### Current Limitations
1. Single currency base (QAR) - manual conversion for other currencies
2. Email notifications require external SMTP (MailHog for development)
3. No real-time collaboration features
4. Limited mobile app support (responsive web only)

### Future Enhancements
1. Multi-currency support with automatic conversion
2. Real-time notifications (WebSocket)
3. Advanced reporting dashboard with charts
4. Mobile native app (React Native)
5. API documentation (Swagger/OpenAPI)
6. Multi-tenancy support
7. Elasticsearch for advanced search

---

## Support & Documentation

### Key Documentation Files
- `README.md` - Quick start and overview
- `TECHNICAL_BRIEF.md` - This document
- `DEPLOYMENT.md` - Detailed deployment guide
- `/scripts/README.md` - Script documentation

### Getting Help
1. Check health endpoint: `/api/health`
2. Review application logs
3. Check environment variables
4. Verify database connectivity
5. Review Azure AD configuration

### Common Issues
- **Auth issues:** Verify NEXTAUTH_URL and Azure AD config
- **Database issues:** Check DATABASE_URL and run migrations
- **Storage issues:** Verify Supabase credentials and bucket permissions
- **Rate limiting:** Check IP address and adjust limits if needed

---

## Conclusion

DAMP is a production-ready, enterprise-grade asset management system built with modern web technologies. It provides comprehensive features for managing assets, subscriptions, and supplier relationships with security, scalability, and user experience as top priorities.

The system is designed for:
- **Scalability:** Handle thousands of assets and users
- **Security:** Enterprise-grade security measures
- **Maintainability:** Clean architecture and comprehensive logging
- **Extensibility:** Modular design for future enhancements

For technical support or questions, refer to the documentation or contact the development team.

---

**Document Version:** 1.0
**Last Updated:** January 28, 2025
**Maintained By:** Development Team
