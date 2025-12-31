# Accreditation Module Spinout Plan

## Objective

Spin out the Accreditation module from DAMP into a standalone project called **"EventPass"** (or similar name). This module handles event accreditation with QR verification, photo uploads, and phase-based access control.

---

## Phase 1: Analysis & Preparation

### 1.1 Identify All Accreditation-Related Files

**Database Models (from prisma/schema.prisma):**
- `AccreditationProject` - Event/project container
- `Accreditation` - Individual accreditation records
- `AccreditationScan` - QR scan logs
- Related enums: `AccreditationStatus`, `AccreditationPhase`

**App Routes:**
```
src/app/admin/(projects)/accreditation/
├── page.tsx                    # Projects list
├── new/page.tsx                # Create project
├── [id]/page.tsx               # Project detail
├── [id]/edit/page.tsx          # Edit project
├── [id]/records/page.tsx       # Accreditation records list
├── [id]/records/new/page.tsx   # Add accreditation
├── [id]/records/[recordId]/page.tsx      # Record detail
├── [id]/records/[recordId]/edit/page.tsx # Edit record

src/app/validator/
├── page.tsx                    # QR scanner page
├── layout.tsx                  # Validator layout

src/app/verify/[token]/
├── page.tsx                    # Public verification page
```

**API Routes:**
```
src/app/api/accreditation/
├── route.ts                    # List/create projects
├── [id]/route.ts               # Get/update/delete project
├── [id]/records/route.ts       # List/create records
├── [id]/records/[recordId]/route.ts    # Get/update/delete record
├── [id]/records/[recordId]/photo/route.ts  # Photo upload
├── export/route.ts             # Excel export
├── scan/route.ts               # QR scan verification
├── verify/[token]/route.ts     # Public verification
```

**Components:**
```
src/components/domains/projects/accreditation/
├── accreditation-list-table.tsx
├── accreditation-form.tsx
├── accreditation-project-form.tsx
├── accreditation-photo-upload.tsx
├── accreditation-qr-code.tsx
├── accreditation-scanner.tsx
├── accreditation-status-badge.tsx
├── phase-selector.tsx
├── index.ts
```

**Lib/Utilities:**
```
src/lib/validations/projects/accreditation.ts   # Zod schemas
src/lib/domains/projects/accreditation/         # Any utils (if exists)
```

**Dependencies:**
- `html5-qrcode` - QR code scanning
- `qrcode` - QR code generation
- Supabase Storage - Photo uploads
- NextAuth - Authentication (VALIDATOR, ACCREDITATION_ADDER, ACCREDITATION_APPROVER roles)

---

## Phase 2: Create New Project Structure

### 2.1 Initialize New Project

```bash
# Create new project folder
mkdir D:\Projects\EventPass
cd D:\Projects\EventPass

# Initialize Next.js 15 with TypeScript
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 2.2 Install Dependencies

```bash
npm install prisma @prisma/client
npm install next-auth @auth/prisma-adapter
npm install zod react-hook-form @hookform/resolvers
npm install html5-qrcode qrcode
npm install @supabase/supabase-js
npm install exceljs
npm install pino pino-pretty
npm install lucide-react
npm install date-fns

# shadcn/ui setup
npx shadcn@latest init
npx shadcn@latest add button card input label select textarea dialog table badge tabs form toast
```

### 2.3 Project Structure

```
EventPass/
├── prisma/
│   └── schema.prisma           # Simplified schema for accreditation only
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing/dashboard
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── projects/       # Accreditation projects
│   │   │   └── settings/       # App settings
│   │   ├── validator/          # QR scanning
│   │   ├── verify/[token]/     # Public verification
│   │   └── api/
│   │       ├── auth/
│   │       ├── projects/
│   │       ├── records/
│   │       └── scan/
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── layout/
│   │   └── accreditation/      # All accreditation components
│   └── lib/
│       ├── auth.ts
│       ├── prisma.ts
│       ├── storage.ts
│       ├── validations/
│       └── utils/
├── tests/
└── package.json
```

---

## Phase 3: Database Schema

### 3.1 Simplified Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(STAFF)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  projects      AccreditationProject[]
  accreditations Accreditation[]
  scans         AccreditationScan[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

enum Role {
  ADMIN
  MANAGER
  STAFF
  VALIDATOR
}

model AccreditationProject {
  id          String   @id @default(cuid())
  name        String
  description String?
  eventDate   DateTime?
  venue       String?
  status      ProjectStatus @default(ACTIVE)

  // Phase control
  bumpInStart  DateTime?
  bumpInEnd    DateTime?
  liveStart    DateTime?
  liveEnd      DateTime?
  bumpOutStart DateTime?
  bumpOutEnd   DateTime?

  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  accreditations Accreditation[]
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

model Accreditation {
  id          String   @id @default(cuid())
  projectId   String
  project     AccreditationProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Person details
  firstName   String
  lastName    String
  email       String?
  phone       String?
  company     String?
  role        String?
  photoUrl    String?

  // Access control
  status      AccreditationStatus @default(PENDING)
  phases      AccreditationPhase[] @default([])

  // Verification
  verificationToken String @unique @default(cuid())
  qrCode      String?

  // Notes
  notes       String?

  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  scans       AccreditationScan[]

  @@index([projectId])
  @@index([verificationToken])
}

enum AccreditationStatus {
  PENDING
  APPROVED
  REJECTED
  REVOKED
  EXPIRED
}

enum AccreditationPhase {
  BUMP_IN
  LIVE
  BUMP_OUT
}

model AccreditationScan {
  id              String   @id @default(cuid())
  accreditationId String
  accreditation   Accreditation @relation(fields: [accreditationId], references: [id], onDelete: Cascade)

  scannedById     String
  scannedBy       User     @relation(fields: [scannedById], references: [id])

  phase           AccreditationPhase
  location        String?
  result          ScanResult
  notes           String?

  scannedAt       DateTime @default(now())

  @@index([accreditationId])
  @@index([scannedAt])
}

enum ScanResult {
  ALLOWED
  DENIED
  EXPIRED
  REVOKED
  WRONG_PHASE
}

model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## Phase 4: Migration Steps

### 4.1 Copy & Adapt Files

1. **Copy all accreditation components** from DAMP to EventPass
2. **Update imports** - remove domain nesting, update paths
3. **Copy validation schemas** and adapt
4. **Copy API route handlers** and simplify
5. **Set up authentication** with simplified roles
6. **Configure Supabase storage** for photos

### 4.2 Environment Variables

```env
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="..."

# Azure AD (or simplify to email/password)
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="..."

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### 4.3 Remove DAMP-Specific Dependencies

- Remove references to `HRProfile`, `Employee`, `Asset`, etc.
- Remove activity logging to DAMP's `ActivityLog` (create standalone if needed)
- Simplify user model - no need for HR-related fields
- Remove currency handling (not needed for accreditation)

---

## Phase 5: Testing & Validation

### 5.1 Core Functionality Checklist

- [ ] Create accreditation project
- [ ] Add accreditation records with photos
- [ ] Generate QR codes
- [ ] Scan QR codes (validator flow)
- [ ] Phase-based access control
- [ ] Public verification page
- [ ] Excel export
- [ ] User authentication
- [ ] Role-based access (Admin, Manager, Staff, Validator)

### 5.2 Test Scenarios

1. **Full Workflow Test:**
   - Create project with phases
   - Add multiple accreditations
   - Approve accreditations
   - Scan during correct phase → ALLOWED
   - Scan during wrong phase → DENIED
   - Revoke accreditation → DENIED on scan

2. **Edge Cases:**
   - Expired accreditation
   - Invalid QR code
   - Photo upload failures
   - Concurrent scans

---

## Phase 6: Cleanup DAMP (After Spinout Works)

### 6.1 Files to Remove from DAMP

```
# Routes
src/app/admin/(projects)/accreditation/
src/app/validator/
src/app/verify/

# API
src/app/api/accreditation/

# Components
src/components/domains/projects/accreditation/

# Validations
src/lib/validations/projects/accreditation.ts

# Any accreditation-specific utilities
```

### 6.2 Database Cleanup

```sql
-- After confirming spinout works and data is migrated
DROP TABLE IF EXISTS "AccreditationScan";
DROP TABLE IF EXISTS "Accreditation";
DROP TABLE IF EXISTS "AccreditationProject";
```

### 6.3 Update DAMP

- Remove accreditation-related roles: `VALIDATOR`, `ACCREDITATION_ADDER`, `ACCREDITATION_APPROVER`
- Update middleware to remove validator routes
- Update sidebar config to remove accreditation links
- Remove accreditation dependencies from package.json

---

## Phase 7: Deployment

### 7.1 Separate Deployments

- **EventPass**: Deploy to Vercel as separate project
- **Database**: New PostgreSQL database (Supabase or similar)
- **Storage**: Separate Supabase project for photos

### 7.2 Domain Setup

- `eventpass.yourdomain.com` or similar
- Configure CORS if needed

---

## Notes

### Minimal Dependencies from DAMP

The Accreditation module has minimal dependencies on other DAMP modules:
- Uses `User` model (needs simplified copy)
- Uses Supabase storage (can use same or new bucket)
- Uses NextAuth (standard setup)
- No dependencies on Assets, Subscriptions, Employees, etc.

### Data Migration (If Needed)

If existing accreditation data needs to be migrated:
```bash
# Export from DAMP
pg_dump -t AccreditationProject -t Accreditation -t AccreditationScan damp_db > accreditation_data.sql

# Import to EventPass (after schema setup)
psql eventpass_db < accreditation_data.sql
```

---

## Execution Command for Claude

When ready to execute this plan, use the following prompt:

```
Please spin out the Accreditation module from DAMP into a new standalone project called "EventPass" in the folder D:\Projects\EventPass.

Follow the SPINOUT_ACCREDITATION.md plan:
1. Create new Next.js 15 project with TypeScript
2. Set up the simplified Prisma schema
3. Copy and adapt all accreditation-related components, routes, and API handlers
4. Set up authentication with simplified roles
5. Ensure all functionality works independently

Do not delete anything from DAMP yet - we will do that after confirming EventPass works.
```
