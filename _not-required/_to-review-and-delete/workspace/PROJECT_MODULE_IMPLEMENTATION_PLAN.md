# Project Module Implementation Plan for DAMP

## Overview

Add a comprehensive Project module to DAMP that serves as a cross-cutting financial entity aggregating costs from multiple modules (Assets, Subscriptions, Purchase Requests) while also supporting detailed budget tracking with hierarchical categories, line items, multi-tranche payments, and profitability analysis.

## Reference Files

Before implementing, review these existing patterns in the codebase:

- `prisma/schema.prisma` - Database schema patterns
- `src/lib/validations/operations/assets.ts` - Validation schema patterns
- `src/lib/domains/operations/assets/` - Domain utility patterns
- `src/app/api/assets/` - API route patterns
- `src/app/admin/(operations)/assets/` - Page/UI patterns
- `src/components/domains/operations/assets/` - Component patterns
- `CLAUDE.md` - Project conventions and architecture

---

## Phase 1: Database Schema

### File: `prisma/schema.prisma`

Add the following models and enums to the existing schema:

```prisma
// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT MODULE - Add after existing models
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum ClientType {
  INTERNAL
  EXTERNAL
  SUPPLIER
}

enum BudgetItemStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  DUE
  OVERDUE
  PENDING_REIMBURSEMENT
  CANCELLED
}

enum PaymentTrancheStatus {
  PENDING
  SCHEDULED
  PROCESSING
  PAID
  FAILED
  CANCELLED
}

enum RevenueStatus {
  DRAFT
  INVOICED
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
  WRITTEN_OFF
}

enum AssetCostType {
  FULL_VALUE
  DEPRECIATED
  RENTAL_RATE
  CUSTOM
  NO_COST
}

// ─────────────────────────────────────────────────────────────────
// PROJECT - Core entity
// ─────────────────────────────────────────────────────────────────

model Project {
  id                  String        @id @default(cuid())
  code                String        @unique  // "PRJ-2025-0001" or custom like "MCITFN25"
  name                String
  description         String?
  status              ProjectStatus @default(PLANNING)
  
  // Client & Contract
  clientType          ClientType    @default(INTERNAL)
  supplierId          String?
  supplier            Supplier?     @relation(fields: [supplierId], references: [id])
  clientName          String?       // For external clients not in Supplier table
  clientContact       String?
  
  // Revenue (Contract Value)
  contractValue       Decimal?      @db.Decimal(12, 2)
  contractCurrency    String        @default("QAR")
  contractValueQAR    Decimal?      @db.Decimal(12, 2)
  
  // Budget
  budgetAmount        Decimal?      @db.Decimal(12, 2)
  budgetCurrency      String        @default("QAR")
  budgetAmountQAR     Decimal?      @db.Decimal(12, 2)
  
  // Timeline
  startDate           DateTime?
  endDate             DateTime?
  
  // Ownership
  managerId           String
  manager             User          @relation("ProjectManager", fields: [managerId], references: [id])
  documentHandler     String?       // Name of person handling documentation
  
  // Budget tracking relations
  budgetCategories    ProjectBudgetCategory[]
  budgetItems         ProjectBudgetItem[]
  revenues            ProjectRevenue[]
  
  // Cross-module relations (optional links)
  purchaseRequests    PurchaseRequest[]
  assetAllocations    ProjectAsset[]
  subscriptionAllocations ProjectSubscription[]
  accreditationProjects AccreditationProject[]
  taskBoards          Board[]
  
  // Audit
  createdById         String
  createdBy           User          @relation("ProjectCreator", fields: [createdById], references: [id])
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  
  @@index([status])
  @@index([code])
  @@index([managerId])
  @@index([startDate, endDate])
}

// ─────────────────────────────────────────────────────────────────
// BUDGET CATEGORIES - Top level groupings (A, B, C, D, E, F)
// ─────────────────────────────────────────────────────────────────

model ProjectBudgetCategory {
  id              String    @id @default(cuid())
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  code            String    // "A", "B", "C", etc.
  name            String    // "Lighting Production and Special Effects"
  description     String?
  sortOrder       Int       @default(0)
  
  // Category-level budget allocation
  budgetedRevenue Decimal?  @db.Decimal(12, 2)  // Revenue expected from this category
  budgetedCost    Decimal?  @db.Decimal(12, 2)  // Cost budget for this category
  
  items           ProjectBudgetItem[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([projectId, code])
  @@index([projectId])
}

// ─────────────────────────────────────────────────────────────────
// BUDGET LINE ITEMS - Individual expenses (A1, B1, B2, F15, etc.)
// ─────────────────────────────────────────────────────────────────

model ProjectBudgetItem {
  id                String           @id @default(cuid())
  projectId         String
  project           Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  categoryId        String?
  category          ProjectBudgetCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  // Identification
  costCode          String           // "A1", "B3", "F15"
  description       String           // "Haze machine and operator"
  sortOrder         Int              @default(0)
  
  // Budget vs Actual
  budgetedAmount    Decimal?         @db.Decimal(12, 2)
  actualAmount      Decimal?         @db.Decimal(12, 2)
  currency          String           @default("QAR")
  actualAmountQAR   Decimal?         @db.Decimal(12, 2)
  
  // Supplier & Procurement
  supplierId        String?
  supplier          Supplier?        @relation(fields: [supplierId], references: [id])
  supplierName      String?          // Manual entry if not in Supplier table
  
  // Link to Purchase Request (optional)
  purchaseRequestId String?
  purchaseRequest   PurchaseRequest? @relation(fields: [purchaseRequestId], references: [id])
  
  // Procurement references
  prNumber          String?          // "BCE-PRF-25-038"
  lpoNumber         String?          // "BCE-PO-25/007"
  invoiceNumber     String?          // "INV-MPQ/0358/2025"
  
  // Payment tracking
  payments          ProjectPayment[]
  paymentStatus     PaymentStatus    @default(PENDING)
  
  // Status
  status            BudgetItemStatus @default(DRAFT)
  
  // Notes and attachments
  notes             String?
  attachmentUrl     String?
  
  // Audit
  createdById       String
  createdBy         User             @relation(fields: [createdById], references: [id])
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@unique([projectId, costCode])
  @@index([projectId])
  @@index([categoryId])
  @@index([paymentStatus])
  @@index([status])
}

// ─────────────────────────────────────────────────────────────────
// PAYMENT TRANCHES - Multi-payment support (P1, P2, P3)
// ─────────────────────────────────────────────────────────────────

model ProjectPayment {
  id              String               @id @default(cuid())
  budgetItemId    String
  budgetItem      ProjectBudgetItem    @relation(fields: [budgetItemId], references: [id], onDelete: Cascade)
  
  // Payment details
  tranche         Int                  // 1, 2, 3 (P1, P2, P3)
  amount          Decimal              @db.Decimal(12, 2)
  currency        String               @default("QAR")
  amountQAR       Decimal              @db.Decimal(12, 2)
  percentage      Decimal?             @db.Decimal(5, 2)  // 50%, 100%
  
  // Dates
  dueDate         DateTime?
  paidDate        DateTime?
  status          PaymentTrancheStatus @default(PENDING)
  
  // Bank details
  bankIban        String?
  bankName        String?
  bankSwift       String?
  accountNumber   String?
  paymentMethod   String?              // "QIIB - TT", "ARB - Bank Authorization", "Paid by BCE CC"
  
  // Reference
  reference       String?
  notes           String?
  
  // Audit
  createdById     String?
  createdBy       User?                @relation(fields: [createdById], references: [id])
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  
  @@unique([budgetItemId, tranche])
  @@index([budgetItemId])
  @@index([status])
  @@index([paidDate])
}

// ─────────────────────────────────────────────────────────────────
// PROJECT REVENUE - Income tracking (invoices to client)
// ─────────────────────────────────────────────────────────────────

model ProjectRevenue {
  id              String        @id @default(cuid())
  projectId       String
  project         Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  description     String
  invoiceNumber   String?
  amount          Decimal       @db.Decimal(12, 2)
  currency        String        @default("QAR")
  amountQAR       Decimal       @db.Decimal(12, 2)
  
  invoiceDate     DateTime?
  dueDate         DateTime?
  paidDate        DateTime?
  status          RevenueStatus @default(DRAFT)
  
  attachmentUrl   String?
  notes           String?
  
  // Audit
  createdById     String
  createdBy       User          @relation(fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([projectId])
  @@index([status])
  @@index([invoiceDate])
}

// ─────────────────────────────────────────────────────────────────
// JUNCTION TABLES - Link standalone modules to projects
// ─────────────────────────────────────────────────────────────────

// Asset allocation to projects (assets remain standalone)
model ProjectAsset {
  id            String        @id @default(cuid())
  projectId     String
  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assetId       String
  asset         Asset         @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  // How to calculate cost for this project
  costType      AssetCostType @default(FULL_VALUE)
  customAmount  Decimal?      @db.Decimal(12, 2)  // If CUSTOM
  customAmountQAR Decimal?    @db.Decimal(12, 2)
  
  // Allocation period
  startDate     DateTime?
  endDate       DateTime?
  
  notes         String?
  
  // Audit
  createdById   String
  createdBy     User          @relation(fields: [createdById], references: [id])
  createdAt     DateTime      @default(now())
  
  @@unique([projectId, assetId])
  @@index([projectId])
  @@index([assetId])
}

// Subscription allocation to projects (with % split)
model ProjectSubscription {
  id                  String       @id @default(cuid())
  projectId           String
  project             Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  subscriptionId      String
  subscription        Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  // % of subscription cost allocated to this project
  allocationPercent   Decimal      @default(100) @db.Decimal(5, 2)
  
  // Allocation period
  startDate           DateTime?
  endDate             DateTime?
  
  notes               String?
  
  // Audit
  createdById         String
  createdBy           User         @relation(fields: [createdById], references: [id])
  createdAt           DateTime     @default(now())
  
  @@unique([projectId, subscriptionId])
  @@index([projectId])
  @@index([subscriptionId])
}
```

### Modifications to Existing Models

Add these relations to existing models in `prisma/schema.prisma`:

```prisma
// Add to existing Asset model:
model Asset {
  // ... existing fields ...
  
  // Add this relation:
  projectAllocations  ProjectAsset[]
}

// Add to existing Subscription model:
model Subscription {
  // ... existing fields ...
  
  // Add this relation:
  projectAllocations  ProjectSubscription[]
}

// Add to existing PurchaseRequest model:
model PurchaseRequest {
  // ... existing fields ...
  
  // Add these fields:
  projectId           String?
  project             Project?  @relation(fields: [projectId], references: [id])
  budgetItems         ProjectBudgetItem[]
}

// Add to existing Board model:
model Board {
  // ... existing fields ...
  
  // Add these fields:
  projectId           String?
  project             Project?  @relation(fields: [projectId], references: [id])
}

// Add to existing AccreditationProject model:
model AccreditationProject {
  // ... existing fields ...
  
  // Add these fields:
  projectId           String?
  project             Project?  @relation(fields: [projectId], references: [id])
}

// Add to existing Supplier model:
model Supplier {
  // ... existing fields ...
  
  // Add these relations:
  projects            Project[]
  budgetItems         ProjectBudgetItem[]
}

// Add to existing User model - add these relations:
model User {
  // ... existing fields ...
  
  // Add these relations:
  managedProjects         Project[]           @relation("ProjectManager")
  createdProjects         Project[]           @relation("ProjectCreator")
  createdBudgetItems      ProjectBudgetItem[]
  createdProjectPayments  ProjectPayment[]
  createdProjectRevenues  ProjectRevenue[]
  createdProjectAssets    ProjectAsset[]
  createdProjectSubscriptions ProjectSubscription[]
}
```

### Run Migration

```bash
npx prisma format
npm run db:generate
npm run db:migrate
```

---

## Phase 2: Validation Schemas

### File: `src/lib/validations/projects/project.ts`

```typescript
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

export const ProjectStatus = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const ClientType = z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']);

export const BudgetItemStatus = z.enum([
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const PaymentStatus = z.enum([
  'PENDING',
  'PARTIAL',
  'PAID',
  'DUE',
  'OVERDUE',
  'PENDING_REIMBURSEMENT',
  'CANCELLED',
]);

export const PaymentTrancheStatus = z.enum([
  'PENDING',
  'SCHEDULED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
]);

export const RevenueStatus = z.enum([
  'DRAFT',
  'INVOICED',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF',
]);

export const AssetCostType = z.enum([
  'FULL_VALUE',
  'DEPRECIATED',
  'RENTAL_RATE',
  'CUSTOM',
  'NO_COST',
]);

// ─────────────────────────────────────────────────────────────────
// PROJECT SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectCreateSchema = z.object({
  code: z.string().min(1, 'Project code is required').max(50),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  status: ProjectStatus.default('PLANNING'),
  
  // Client
  clientType: ClientType.default('INTERNAL'),
  supplierId: z.string().cuid().optional().nullable(),
  clientName: z.string().max(255).optional().nullable(),
  clientContact: z.string().max(255).optional().nullable(),
  
  // Contract
  contractValue: z.coerce.number().min(0).optional().nullable(),
  contractCurrency: z.string().default('QAR'),
  
  // Budget
  budgetAmount: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().default('QAR'),
  
  // Timeline
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  
  // Ownership
  managerId: z.string().cuid('Invalid manager ID'),
  documentHandler: z.string().max(255).optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
).refine(
  (data) => {
    if (data.clientType === 'SUPPLIER' && !data.supplierId) {
      return false;
    }
    return true;
  },
  { message: 'Supplier must be selected for Supplier client type', path: ['supplierId'] }
).refine(
  (data) => {
    if (data.clientType === 'EXTERNAL' && !data.clientName) {
      return false;
    }
    return true;
  },
  { message: 'Client name is required for external clients', path: ['clientName'] }
);

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// BUDGET CATEGORY SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const budgetCategoryCreateSchema = z.object({
  projectId: z.string().cuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  budgetedRevenue: z.coerce.number().min(0).optional().nullable(),
  budgetedCost: z.coerce.number().min(0).optional().nullable(),
});

export const budgetCategoryUpdateSchema = budgetCategoryCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type BudgetCategoryCreateInput = z.infer<typeof budgetCategoryCreateSchema>;
export type BudgetCategoryUpdateInput = z.infer<typeof budgetCategoryUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// BUDGET ITEM SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const budgetItemCreateSchema = z.object({
  projectId: z.string().cuid(),
  categoryId: z.string().cuid().optional().nullable(),
  costCode: z.string().min(1).max(20),
  description: z.string().min(1).max(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
  
  // Amounts
  budgetedAmount: z.coerce.number().min(0).optional().nullable(),
  actualAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default('QAR'),
  
  // Supplier
  supplierId: z.string().cuid().optional().nullable(),
  supplierName: z.string().max(255).optional().nullable(),
  
  // Procurement
  purchaseRequestId: z.string().cuid().optional().nullable(),
  prNumber: z.string().max(50).optional().nullable(),
  lpoNumber: z.string().max(50).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  
  // Status
  paymentStatus: PaymentStatus.default('PENDING'),
  status: BudgetItemStatus.default('DRAFT'),
  
  // Notes
  notes: z.string().max(2000).optional().nullable(),
});

export const budgetItemUpdateSchema = budgetItemCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type BudgetItemCreateInput = z.infer<typeof budgetItemCreateSchema>;
export type BudgetItemUpdateInput = z.infer<typeof budgetItemUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// PAYMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const paymentCreateSchema = z.object({
  budgetItemId: z.string().cuid(),
  tranche: z.coerce.number().int().min(1).max(10),
  amount: z.coerce.number().min(0),
  currency: z.string().default('QAR'),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  
  // Dates
  dueDate: z.coerce.date().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  status: PaymentTrancheStatus.default('PENDING'),
  
  // Bank details
  bankIban: z.string().max(50).optional().nullable(),
  bankName: z.string().max(255).optional().nullable(),
  bankSwift: z.string().max(20).optional().nullable(),
  accountNumber: z.string().max(50).optional().nullable(),
  paymentMethod: z.string().max(100).optional().nullable(),
  
  // Reference
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const paymentUpdateSchema = paymentCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// REVENUE SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const revenueCreateSchema = z.object({
  projectId: z.string().cuid(),
  description: z.string().min(1).max(500),
  invoiceNumber: z.string().max(100).optional().nullable(),
  amount: z.coerce.number().min(0),
  currency: z.string().default('QAR'),
  
  invoiceDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  status: RevenueStatus.default('DRAFT'),
  
  notes: z.string().max(2000).optional().nullable(),
});

export const revenueUpdateSchema = revenueCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type RevenueCreateInput = z.infer<typeof revenueCreateSchema>;
export type RevenueUpdateInput = z.infer<typeof revenueUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// PROJECT ASSET ALLOCATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectAssetCreateSchema = z.object({
  projectId: z.string().cuid(),
  assetId: z.string().cuid(),
  costType: AssetCostType.default('FULL_VALUE'),
  customAmount: z.coerce.number().min(0).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.costType === 'CUSTOM' && !data.customAmount) {
      return false;
    }
    return true;
  },
  { message: 'Custom amount is required when cost type is CUSTOM', path: ['customAmount'] }
);

export type ProjectAssetCreateInput = z.infer<typeof projectAssetCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// PROJECT SUBSCRIPTION ALLOCATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectSubscriptionCreateSchema = z.object({
  projectId: z.string().cuid(),
  subscriptionId: z.string().cuid(),
  allocationPercent: z.coerce.number().min(0).max(100).default(100),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ProjectSubscriptionCreateInput = z.infer<typeof projectSubscriptionCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// QUERY/FILTER SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectQuerySchema = z.object({
  search: z.string().optional(),
  status: ProjectStatus.optional(),
  clientType: ClientType.optional(),
  managerId: z.string().cuid().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'status', 'startDate', 'endDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
```

### File: `src/lib/validations/projects/index.ts`

```typescript
export * from './project';
```

### Update: `src/lib/validations/index.ts`

Add export for projects:

```typescript
// Add this line:
export * from './projects';
```

---

## Phase 3: Domain Utilities

### File: `src/lib/domains/projects/project-utils.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Generate next project code in format PRJ-YYYY-NNNN
 */
export async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  
  const lastProject = await prisma.project.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  
  let nextNumber = 1;
  if (lastProject) {
    const lastNumber = parseInt(lastProject.code.slice(-4), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Get exchange rate for currency conversion to QAR
 */
export async function getExchangeRate(currency: string): Promise<number> {
  if (currency === 'QAR') return 1;
  
  const settings = await prisma.systemSettings.findFirst({
    where: { key: `exchange_rate_${currency.toUpperCase()}_QAR` },
  });
  
  if (settings?.value) {
    return parseFloat(settings.value);
  }
  
  // Default rates if not configured
  const defaultRates: Record<string, number> = {
    USD: 3.64,
    EUR: 3.97,
    GBP: 4.62,
    AED: 0.99,
  };
  
  return defaultRates[currency.toUpperCase()] || 1;
}

/**
 * Convert amount to QAR
 */
export async function convertToQAR(amount: number, currency: string): Promise<number> {
  const rate = await getExchangeRate(currency);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Calculate next cost code for a category
 */
export async function generateCostCode(projectId: string, categoryCode: string): Promise<string> {
  const lastItem = await prisma.projectBudgetItem.findFirst({
    where: {
      projectId,
      costCode: { startsWith: categoryCode },
    },
    orderBy: { costCode: 'desc' },
    select: { costCode: true },
  });
  
  if (!lastItem) {
    return `${categoryCode}1`;
  }
  
  // Extract number from cost code (e.g., "A15" -> 15)
  const match = lastItem.costCode.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[2], 10) + 1;
    return `${categoryCode}${nextNum}`;
  }
  
  return `${categoryCode}1`;
}
```

### File: `src/lib/domains/projects/profitability.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma, AssetCostType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  purchaseRequests: {
    count: number;
    totalQAR: number;
  };
  budgetItems: {
    count: number;
    budgetedQAR: number;
    actualQAR: number;
  };
  assets: {
    count: number;
    totalQAR: number;
  };
  subscriptions: {
    count: number;
    totalQAR: number;
    monthlyQAR: number;
  };
}

export interface RevenueBreakdown {
  contractValueQAR: number;
  invoicedQAR: number;
  paidQAR: number;
  pendingQAR: number;
  overdueQAR: number;
}

export interface ProjectFinancials {
  projectId: string;
  projectCode: string;
  projectName: string;
  
  // Revenue
  revenue: RevenueBreakdown;
  
  // Costs
  costs: CostBreakdown;
  totalCostQAR: number;
  
  // Budget
  budgetedCostQAR: number;
  actualCostQAR: number;
  budgetVarianceQAR: number;
  budgetUtilizationPercent: number;
  
  // Profitability
  grossProfitQAR: number;
  grossMarginPercent: number;
  targetProfitQAR: number;
  actualProfitQAR: number;
  
  // Status indicators
  isProfitable: boolean;
  isOverBudget: boolean;
}

export interface PaymentSummary {
  totalDueQAR: number;
  paidQAR: number;
  pendingQAR: number;
  overdueQAR: number;
  pendingReimbursementQAR: number;
  byStatus: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────
// MAIN CALCULATION FUNCTION
// ─────────────────────────────────────────────────────────────────

export async function calculateProjectFinancials(projectId: string): Promise<ProjectFinancials | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgetItems: {
        include: {
          payments: true,
        },
      },
      revenues: true,
      purchaseRequests: {
        where: { status: 'APPROVED' },
      },
      assetAllocations: {
        include: { asset: true },
      },
      subscriptionAllocations: {
        include: { subscription: true },
      },
    },
  });
  
  if (!project) return null;
  
  // ─── Calculate Revenue ───
  const contractValueQAR = project.contractValueQAR?.toNumber() || 0;
  
  const revenueStats = project.revenues.reduce(
    (acc, rev) => {
      const amount = rev.amountQAR.toNumber();
      acc.invoiced += amount;
      if (rev.status === 'PAID') acc.paid += amount;
      if (rev.status === 'OVERDUE') acc.overdue += amount;
      if (['DRAFT', 'INVOICED', 'PARTIALLY_PAID'].includes(rev.status)) {
        acc.pending += amount;
      }
      return acc;
    },
    { invoiced: 0, paid: 0, pending: 0, overdue: 0 }
  );
  
  // ─── Calculate Budget Item Costs ───
  const budgetItemStats = project.budgetItems.reduce(
    (acc, item) => {
      acc.count++;
      acc.budgeted += item.budgetedAmount?.toNumber() || 0;
      acc.actual += item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0;
      return acc;
    },
    { count: 0, budgeted: 0, actual: 0 }
  );
  
  // ─── Calculate PR Costs ───
  const prCosts = project.purchaseRequests.reduce(
    (acc, pr) => {
      acc.count++;
      acc.total += (pr as any).totalAmountQAR?.toNumber() || 0;
      return acc;
    },
    { count: 0, total: 0 }
  );
  
  // ─── Calculate Asset Costs ───
  const assetCosts = project.assetAllocations.reduce(
    (acc, pa) => {
      acc.count++;
      let cost = 0;
      switch (pa.costType) {
        case 'FULL_VALUE':
          cost = (pa.asset as any).priceQAR?.toNumber() || 0;
          break;
        case 'CUSTOM':
          cost = pa.customAmountQAR?.toNumber() || pa.customAmount?.toNumber() || 0;
          break;
        case 'NO_COST':
          cost = 0;
          break;
        default:
          cost = (pa.asset as any).priceQAR?.toNumber() || 0;
      }
      acc.total += cost;
      return acc;
    },
    { count: 0, total: 0 }
  );
  
  // ─── Calculate Subscription Costs ───
  const subscriptionCosts = project.subscriptionAllocations.reduce(
    (acc, ps) => {
      acc.count++;
      const fullCost = (ps.subscription as any).costQAR?.toNumber() || 0;
      const allocated = fullCost * (ps.allocationPercent.toNumber() / 100);
      acc.total += allocated;
      acc.monthly += allocated; // Assuming monthly for now
      return acc;
    },
    { count: 0, total: 0, monthly: 0 }
  );
  
  // ─── Aggregate Totals ───
  const budgetedCostQAR = project.budgetAmountQAR?.toNumber() || budgetItemStats.budgeted;
  const actualCostQAR = budgetItemStats.actual;
  const totalCostQAR = actualCostQAR + prCosts.total + assetCosts.total + subscriptionCosts.total;
  
  const budgetVarianceQAR = budgetedCostQAR - actualCostQAR;
  const budgetUtilizationPercent = budgetedCostQAR > 0 
    ? Math.round((actualCostQAR / budgetedCostQAR) * 100 * 10) / 10 
    : 0;
  
  const grossProfitQAR = contractValueQAR - actualCostQAR;
  const grossMarginPercent = contractValueQAR > 0 
    ? Math.round((grossProfitQAR / contractValueQAR) * 100 * 10) / 10 
    : 0;
  
  const targetProfitQAR = contractValueQAR - budgetedCostQAR;
  const actualProfitQAR = contractValueQAR - actualCostQAR;
  
  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    
    revenue: {
      contractValueQAR,
      invoicedQAR: revenueStats.invoiced,
      paidQAR: revenueStats.paid,
      pendingQAR: revenueStats.pending,
      overdueQAR: revenueStats.overdue,
    },
    
    costs: {
      purchaseRequests: { count: prCosts.count, totalQAR: prCosts.total },
      budgetItems: {
        count: budgetItemStats.count,
        budgetedQAR: budgetItemStats.budgeted,
        actualQAR: budgetItemStats.actual,
      },
      assets: { count: assetCosts.count, totalQAR: assetCosts.total },
      subscriptions: {
        count: subscriptionCosts.count,
        totalQAR: subscriptionCosts.total,
        monthlyQAR: subscriptionCosts.monthly,
      },
    },
    totalCostQAR,
    
    budgetedCostQAR,
    actualCostQAR,
    budgetVarianceQAR,
    budgetUtilizationPercent,
    
    grossProfitQAR,
    grossMarginPercent,
    targetProfitQAR,
    actualProfitQAR,
    
    isProfitable: grossProfitQAR > 0,
    isOverBudget: actualCostQAR > budgetedCostQAR,
  };
}

// ─────────────────────────────────────────────────────────────────
// PAYMENT SUMMARY
// ─────────────────────────────────────────────────────────────────

export async function calculatePaymentSummary(projectId: string): Promise<PaymentSummary> {
  const payments = await prisma.projectPayment.findMany({
    where: {
      budgetItem: { projectId },
    },
  });
  
  const summary: PaymentSummary = {
    totalDueQAR: 0,
    paidQAR: 0,
    pendingQAR: 0,
    overdueQAR: 0,
    pendingReimbursementQAR: 0,
    byStatus: {},
  };
  
  const now = new Date();
  
  for (const payment of payments) {
    const amount = payment.amountQAR.toNumber();
    summary.totalDueQAR += amount;
    
    // By status
    summary.byStatus[payment.status] = (summary.byStatus[payment.status] || 0) + amount;
    
    if (payment.status === 'PAID') {
      summary.paidQAR += amount;
    } else if (payment.status === 'PENDING' || payment.status === 'SCHEDULED') {
      if (payment.dueDate && payment.dueDate < now) {
        summary.overdueQAR += amount;
      } else {
        summary.pendingQAR += amount;
      }
    }
  }
  
  // Check budget items for pending reimbursement
  const reimbursementItems = await prisma.projectBudgetItem.findMany({
    where: {
      projectId,
      paymentStatus: 'PENDING_REIMBURSEMENT',
    },
  });
  
  summary.pendingReimbursementQAR = reimbursementItems.reduce(
    (sum, item) => sum + (item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0),
    0
  );
  
  return summary;
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY SUMMARIES
// ─────────────────────────────────────────────────────────────────

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
  budgetedRevenue: number;
  budgetedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  itemCount: number;
}

export async function calculateCategorySummaries(projectId: string): Promise<CategorySummary[]> {
  const categories = await prisma.projectBudgetCategory.findMany({
    where: { projectId },
    include: {
      items: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
  
  return categories.map((cat) => {
    const actualCost = cat.items.reduce(
      (sum, item) => sum + (item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0),
      0
    );
    const budgetedCost = cat.budgetedCost?.toNumber() || 0;
    const variance = budgetedCost - actualCost;
    const variancePercent = budgetedCost > 0 
      ? Math.round((variance / budgetedCost) * 100 * 10) / 10 
      : 0;
    
    return {
      id: cat.id,
      code: cat.code,
      name: cat.name,
      budgetedRevenue: cat.budgetedRevenue?.toNumber() || 0,
      budgetedCost,
      actualCost,
      variance,
      variancePercent,
      itemCount: cat.items.length,
    };
  });
}
```

### File: `src/lib/domains/projects/index.ts`

```typescript
export * from './project-utils';
export * from './profitability';
```

---

## Phase 4: API Routes

### File: `src/app/api/projects/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { projectCreateSchema, projectQuerySchema } from '@/lib/validations/projects';
import { generateProjectCode, convertToQAR } from '@/lib/domains/projects';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/projects - List projects with filtering
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = projectQuerySchema.parse(Object.fromEntries(searchParams));
  
  const where: any = {};
  
  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
      { clientName: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  
  if (query.status) where.status = query.status;
  if (query.clientType) where.clientType = query.clientType;
  if (query.managerId) where.managerId = query.managerId;
  
  if (query.startDateFrom || query.startDateTo) {
    where.startDate = {};
    if (query.startDateFrom) where.startDate.gte = query.startDateFrom;
    if (query.startDateTo) where.startDate.lte = query.startDateTo;
  }
  
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true } },
        _count: {
          select: {
            budgetItems: true,
            purchaseRequests: true,
          },
        },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.project.count({ where }),
  ]);
  
  return Response.json({
    data: projects,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
}, { requireAuth: true });

// POST /api/projects - Create project
export const POST = withErrorHandler(async (request: NextRequest, { session }) => {
  const body = await request.json();
  const data = projectCreateSchema.parse(body);
  
  // Generate code if not provided or use custom
  const code = data.code || await generateProjectCode();
  
  // Convert to QAR if needed
  const contractValueQAR = data.contractValue && data.contractCurrency !== 'QAR'
    ? await convertToQAR(data.contractValue, data.contractCurrency)
    : data.contractValue;
  
  const budgetAmountQAR = data.budgetAmount && data.budgetCurrency !== 'QAR'
    ? await convertToQAR(data.budgetAmount, data.budgetCurrency)
    : data.budgetAmount;
  
  const project = await prisma.project.create({
    data: {
      ...data,
      code,
      contractValueQAR,
      budgetAmountQAR,
      createdById: session!.user.id,
    },
    include: {
      manager: { select: { id: true, name: true, email: true } },
    },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.PROJECT_CREATED,
    'Project',
    project.id,
    { code: project.code, name: project.name }
  );
  
  return Response.json({ data: project }, { status: 201 });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { projectUpdateSchema } from '@/lib/validations/projects';
import { convertToQAR } from '@/lib/domains/projects';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/projects/[id] - Get single project with full details
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true } },
      budgetCategories: {
        orderBy: { sortOrder: 'asc' },
      },
      budgetItems: {
        include: {
          category: true,
          supplier: { select: { id: true, name: true } },
          payments: { orderBy: { tranche: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      revenues: {
        orderBy: { invoiceDate: 'desc' },
      },
      _count: {
        select: {
          purchaseRequests: true,
          assetAllocations: true,
          subscriptionAllocations: true,
          taskBoards: true,
        },
      },
    },
  });
  
  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  
  return Response.json({ data: project });
}, { requireAuth: true });

// PATCH /api/projects/[id] - Update project
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const body = await request.json();
  const data = projectUpdateSchema.parse({ ...body, id: params.id });
  
  const existing = await prisma.project.findUnique({
    where: { id: params.id },
  });
  
  if (!existing) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Convert to QAR if currency changed
  let contractValueQAR = data.contractValue;
  if (data.contractValue && data.contractCurrency && data.contractCurrency !== 'QAR') {
    contractValueQAR = await convertToQAR(data.contractValue, data.contractCurrency);
  }
  
  let budgetAmountQAR = data.budgetAmount;
  if (data.budgetAmount && data.budgetCurrency && data.budgetCurrency !== 'QAR') {
    budgetAmountQAR = await convertToQAR(data.budgetAmount, data.budgetCurrency);
  }
  
  const { id, ...updateData } = data;
  
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...updateData,
      contractValueQAR,
      budgetAmountQAR,
    },
    include: {
      manager: { select: { id: true, name: true, email: true } },
    },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.PROJECT_UPDATED,
    'Project',
    project.id,
    { changes: updateData }
  );
  
  return Response.json({ data: project });
}, { requireAuth: true });

// DELETE /api/projects/[id] - Delete project
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const existing = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          budgetItems: true,
          purchaseRequests: true,
        },
      },
    },
  });
  
  if (!existing) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Soft check - warn if has related data
  if (existing._count.budgetItems > 0 || existing._count.purchaseRequests > 0) {
    // Could implement soft delete or require force flag
  }
  
  await prisma.project.delete({
    where: { id: params.id },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.PROJECT_DELETED,
    'Project',
    params.id,
    { code: existing.code, name: existing.name }
  );
  
  return Response.json({ success: true });
}, { requireAuth: true, requireAdmin: true });
```

### File: `src/app/api/projects/[id]/financials/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import { 
  calculateProjectFinancials, 
  calculatePaymentSummary,
  calculateCategorySummaries 
} from '@/lib/domains/projects';

// GET /api/projects/[id]/financials - Get project financial summary
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const [financials, payments, categories] = await Promise.all([
    calculateProjectFinancials(params.id),
    calculatePaymentSummary(params.id),
    calculateCategorySummaries(params.id),
  ]);
  
  if (!financials) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  
  return Response.json({
    data: {
      ...financials,
      payments,
      categories,
    },
  });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/budget-categories/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { budgetCategoryCreateSchema } from '@/lib/validations/projects';

// GET /api/projects/[id]/budget-categories
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const categories = await prisma.projectBudgetCategory.findMany({
    where: { projectId: params.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
  
  return Response.json({ data: categories });
}, { requireAuth: true });

// POST /api/projects/[id]/budget-categories
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const data = budgetCategoryCreateSchema.parse({ ...body, projectId: params.id });
  
  const category = await prisma.projectBudgetCategory.create({
    data,
  });
  
  return Response.json({ data: category }, { status: 201 });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/budget-items/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { budgetItemCreateSchema } from '@/lib/validations/projects';
import { convertToQAR, generateCostCode } from '@/lib/domains/projects';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/projects/[id]/budget-items
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const paymentStatus = searchParams.get('paymentStatus');
  
  const where: any = { projectId: params.id };
  if (categoryId) where.categoryId = categoryId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  
  const items = await prisma.projectBudgetItem.findMany({
    where,
    include: {
      category: { select: { id: true, code: true, name: true } },
      supplier: { select: { id: true, name: true } },
      purchaseRequest: { select: { id: true, prNumber: true, status: true } },
      payments: { orderBy: { tranche: 'asc' } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  });
  
  return Response.json({ data: items });
}, { requireAuth: true });

// POST /api/projects/[id]/budget-items
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const body = await request.json();
  const data = budgetItemCreateSchema.parse({ ...body, projectId: params.id });
  
  // Auto-generate cost code if category provided but no code
  let costCode = data.costCode;
  if (!costCode && data.categoryId) {
    const category = await prisma.projectBudgetCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (category) {
      costCode = await generateCostCode(params.id, category.code);
    }
  }
  
  // Convert actual amount to QAR
  const actualAmountQAR = data.actualAmount && data.currency !== 'QAR'
    ? await convertToQAR(data.actualAmount, data.currency)
    : data.actualAmount;
  
  const item = await prisma.projectBudgetItem.create({
    data: {
      ...data,
      costCode,
      actualAmountQAR,
      createdById: session!.user.id,
    },
    include: {
      category: true,
      supplier: true,
      payments: true,
    },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.BUDGET_ITEM_CREATED,
    'ProjectBudgetItem',
    item.id,
    { projectId: params.id, costCode: item.costCode }
  );
  
  return Response.json({ data: item }, { status: 201 });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/budget-items/[itemId]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { budgetItemUpdateSchema } from '@/lib/validations/projects';
import { convertToQAR } from '@/lib/domains/projects';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/projects/[id]/budget-items/[itemId]
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) => {
  const item = await prisma.projectBudgetItem.findUnique({
    where: { id: params.itemId, projectId: params.id },
    include: {
      category: true,
      supplier: true,
      purchaseRequest: true,
      payments: { orderBy: { tranche: 'asc' } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  
  if (!item) {
    return Response.json({ error: 'Budget item not found' }, { status: 404 });
  }
  
  return Response.json({ data: item });
}, { requireAuth: true });

// PATCH /api/projects/[id]/budget-items/[itemId]
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string; itemId: string }; session: any }
) => {
  const body = await request.json();
  const data = budgetItemUpdateSchema.parse({ ...body, id: params.itemId });
  
  const existing = await prisma.projectBudgetItem.findUnique({
    where: { id: params.itemId, projectId: params.id },
  });
  
  if (!existing) {
    return Response.json({ error: 'Budget item not found' }, { status: 404 });
  }
  
  // Convert actual amount to QAR if changed
  let actualAmountQAR = data.actualAmount;
  if (data.actualAmount && data.currency && data.currency !== 'QAR') {
    actualAmountQAR = await convertToQAR(data.actualAmount, data.currency);
  }
  
  const { id, ...updateData } = data;
  
  const item = await prisma.projectBudgetItem.update({
    where: { id: params.itemId },
    data: {
      ...updateData,
      actualAmountQAR,
    },
    include: {
      category: true,
      supplier: true,
      payments: true,
    },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.BUDGET_ITEM_UPDATED,
    'ProjectBudgetItem',
    item.id,
    { changes: updateData }
  );
  
  return Response.json({ data: item });
}, { requireAuth: true });

// DELETE /api/projects/[id]/budget-items/[itemId]
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string; itemId: string }; session: any }
) => {
  const existing = await prisma.projectBudgetItem.findUnique({
    where: { id: params.itemId, projectId: params.id },
  });
  
  if (!existing) {
    return Response.json({ error: 'Budget item not found' }, { status: 404 });
  }
  
  await prisma.projectBudgetItem.delete({
    where: { id: params.itemId },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.BUDGET_ITEM_DELETED,
    'ProjectBudgetItem',
    params.itemId,
    { costCode: existing.costCode }
  );
  
  return Response.json({ success: true });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/budget-items/[itemId]/payments/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { paymentCreateSchema } from '@/lib/validations/projects';
import { convertToQAR } from '@/lib/domains/projects';

// GET /api/projects/[id]/budget-items/[itemId]/payments
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) => {
  const payments = await prisma.projectPayment.findMany({
    where: { budgetItemId: params.itemId },
    orderBy: { tranche: 'asc' },
  });
  
  return Response.json({ data: payments });
}, { requireAuth: true });

// POST /api/projects/[id]/budget-items/[itemId]/payments
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string; itemId: string }; session: any }
) => {
  const body = await request.json();
  const data = paymentCreateSchema.parse({ ...body, budgetItemId: params.itemId });
  
  // Convert to QAR
  const amountQAR = data.currency !== 'QAR'
    ? await convertToQAR(data.amount, data.currency)
    : data.amount;
  
  const payment = await prisma.projectPayment.create({
    data: {
      ...data,
      amountQAR,
      createdById: session!.user.id,
    },
  });
  
  // Update budget item payment status
  await updateBudgetItemPaymentStatus(params.itemId);
  
  return Response.json({ data: payment }, { status: 201 });
}, { requireAuth: true });

// Helper to update budget item status based on payments
async function updateBudgetItemPaymentStatus(budgetItemId: string) {
  const payments = await prisma.projectPayment.findMany({
    where: { budgetItemId },
  });
  
  const item = await prisma.projectBudgetItem.findUnique({
    where: { id: budgetItemId },
  });
  
  if (!item || payments.length === 0) return;
  
  const totalPaid = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amountQAR.toNumber(), 0);
  
  const totalDue = payments.reduce((sum, p) => sum + p.amountQAR.toNumber(), 0);
  const actualAmount = item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || totalDue;
  
  let paymentStatus: string;
  if (totalPaid >= actualAmount) {
    paymentStatus = 'PAID';
  } else if (totalPaid > 0) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'PENDING';
  }
  
  await prisma.projectBudgetItem.update({
    where: { id: budgetItemId },
    data: { paymentStatus: paymentStatus as any },
  });
}
```

### File: `src/app/api/projects/[id]/revenues/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { revenueCreateSchema } from '@/lib/validations/projects';
import { convertToQAR } from '@/lib/domains/projects';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/projects/[id]/revenues
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const revenues = await prisma.projectRevenue.findMany({
    where: { projectId: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { invoiceDate: 'desc' },
  });
  
  return Response.json({ data: revenues });
}, { requireAuth: true });

// POST /api/projects/[id]/revenues
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const body = await request.json();
  const data = revenueCreateSchema.parse({ ...body, projectId: params.id });
  
  const amountQAR = data.currency !== 'QAR'
    ? await convertToQAR(data.amount, data.currency)
    : data.amount;
  
  const revenue = await prisma.projectRevenue.create({
    data: {
      ...data,
      amountQAR,
      createdById: session!.user.id,
    },
  });
  
  await logAction(
    session!.user.id,
    ActivityActions.REVENUE_CREATED,
    'ProjectRevenue',
    revenue.id,
    { projectId: params.id, amount: data.amount }
  );
  
  return Response.json({ data: revenue }, { status: 201 });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/assets/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { projectAssetCreateSchema } from '@/lib/validations/projects';
import { convertToQAR } from '@/lib/domains/projects';

// GET /api/projects/[id]/assets - Get allocated assets
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const allocations = await prisma.projectAsset.findMany({
    where: { projectId: params.id },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          status: true,
          price: true,
          priceCurrency: true,
          priceQAR: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
  
  return Response.json({ data: allocations });
}, { requireAuth: true });

// POST /api/projects/[id]/assets - Allocate asset to project
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const body = await request.json();
  const data = projectAssetCreateSchema.parse({ ...body, projectId: params.id });
  
  // Check if already allocated
  const existing = await prisma.projectAsset.findUnique({
    where: {
      projectId_assetId: {
        projectId: params.id,
        assetId: data.assetId,
      },
    },
  });
  
  if (existing) {
    return Response.json(
      { error: 'Asset is already allocated to this project' },
      { status: 400 }
    );
  }
  
  // Convert custom amount to QAR if needed
  let customAmountQAR = data.customAmount;
  if (data.customAmount) {
    customAmountQAR = await convertToQAR(data.customAmount, 'QAR');
  }
  
  const allocation = await prisma.projectAsset.create({
    data: {
      ...data,
      customAmountQAR,
      createdById: session!.user.id,
    },
    include: {
      asset: true,
    },
  });
  
  return Response.json({ data: allocation }, { status: 201 });
}, { requireAuth: true });
```

### File: `src/app/api/projects/[id]/subscriptions/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { projectSubscriptionCreateSchema } from '@/lib/validations/projects';

// GET /api/projects/[id]/subscriptions - Get allocated subscriptions
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const allocations = await prisma.projectSubscription.findMany({
    where: { projectId: params.id },
    include: {
      subscription: {
        select: {
          id: true,
          name: true,
          status: true,
          costPerCycle: true,
          costCurrency: true,
          costQAR: true,
          billingCycle: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
  
  return Response.json({ data: allocations });
}, { requireAuth: true });

// POST /api/projects/[id]/subscriptions - Allocate subscription to project
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params, session }: { params: { id: string }; session: any }
) => {
  const body = await request.json();
  const data = projectSubscriptionCreateSchema.parse({ ...body, projectId: params.id });
  
  // Check total allocation doesn't exceed 100%
  const existingAllocations = await prisma.projectSubscription.findMany({
    where: { subscriptionId: data.subscriptionId },
  });
  
  const totalAllocated = existingAllocations.reduce(
    (sum, a) => sum + a.allocationPercent.toNumber(),
    0
  );
  
  if (totalAllocated + data.allocationPercent > 100) {
    return Response.json(
      { 
        error: 'Total allocation cannot exceed 100%',
        details: { currentlyAllocated: totalAllocated, requested: data.allocationPercent }
      },
      { status: 400 }
    );
  }
  
  const allocation = await prisma.projectSubscription.create({
    data: {
      ...data,
      createdById: session!.user.id,
    },
    include: {
      subscription: true,
    },
  });
  
  return Response.json({ data: allocation }, { status: 201 });
}, { requireAuth: true });
```

---

## Phase 5: Activity Log Constants

### Update: `src/lib/activity.ts`

Add these action types to the existing `ActivityActions` object:

```typescript
export const ActivityActions = {
  // ... existing actions ...
  
  // Project actions
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',
  
  // Budget actions
  BUDGET_CATEGORY_CREATED: 'BUDGET_CATEGORY_CREATED',
  BUDGET_CATEGORY_UPDATED: 'BUDGET_CATEGORY_UPDATED',
  BUDGET_CATEGORY_DELETED: 'BUDGET_CATEGORY_DELETED',
  BUDGET_ITEM_CREATED: 'BUDGET_ITEM_CREATED',
  BUDGET_ITEM_UPDATED: 'BUDGET_ITEM_UPDATED',
  BUDGET_ITEM_DELETED: 'BUDGET_ITEM_DELETED',
  
  // Payment actions
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_STATUS_CHANGED: 'PAYMENT_STATUS_CHANGED',
  
  // Revenue actions
  REVENUE_CREATED: 'REVENUE_CREATED',
  REVENUE_UPDATED: 'REVENUE_UPDATED',
  REVENUE_STATUS_CHANGED: 'REVENUE_STATUS_CHANGED',
  
  // Allocation actions
  PROJECT_ASSET_ALLOCATED: 'PROJECT_ASSET_ALLOCATED',
  PROJECT_ASSET_REMOVED: 'PROJECT_ASSET_REMOVED',
  PROJECT_SUBSCRIPTION_ALLOCATED: 'PROJECT_SUBSCRIPTION_ALLOCATED',
  PROJECT_SUBSCRIPTION_REMOVED: 'PROJECT_SUBSCRIPTION_REMOVED',
};
```

---

## Phase 6: Page Routes

### File: `src/app/admin/(projects)/projects/page.tsx`

```typescript
import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectListTable } from '@/components/domains/projects/project-list-table';
import { ProjectListFilters } from '@/components/domains/projects/project-list-filters';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/ui/skeletons';

export const metadata: Metadata = {
  title: 'Projects | DAMP',
  description: 'Manage projects and track profitability',
};

interface ProjectsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    clientType?: string;
    page?: string;
  };
}

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage projects, budgets, and track profitability"
      >
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </PageHeader>
      
      <ProjectListFilters />
      
      <Suspense fallback={<TableSkeleton />}>
        <ProjectListTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

### File: `src/app/admin/(projects)/projects/new/page.tsx`

```typescript
import { Metadata } from 'next';
import { ProjectForm } from '@/components/domains/projects/project-form';
import { PageHeader } from '@/components/layout/page-header';
import { getUsers } from '@/lib/data/users';
import { getSuppliers } from '@/lib/data/suppliers';

export const metadata: Metadata = {
  title: 'New Project | DAMP',
};

export default async function NewProjectPage() {
  const [users, suppliers] = await Promise.all([
    getUsers({ role: 'ADMIN' }),
    getSuppliers({ status: 'APPROVED' }),
  ]);
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Project"
        description="Set up a new project with budget tracking"
        backHref="/admin/projects"
      />
      
      <ProjectForm users={users} suppliers={suppliers} />
    </div>
  );
}
```

### File: `src/app/admin/(projects)/projects/[id]/page.tsx`

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { calculateProjectFinancials, calculatePaymentSummary } from '@/lib/domains/projects';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectDashboard } from '@/components/domains/projects/project-dashboard';
import { ProjectTabs } from '@/components/domains/projects/project-tabs';

interface ProjectDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { code: true, name: true },
  });
  
  if (!project) return { title: 'Project Not Found' };
  
  return {
    title: `${project.code}: ${project.name} | DAMP`,
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true } },
      budgetCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            include: {
              payments: { orderBy: { tranche: 'asc' } },
              supplier: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      revenues: { orderBy: { invoiceDate: 'desc' } },
      _count: {
        select: {
          purchaseRequests: true,
          assetAllocations: true,
          subscriptionAllocations: true,
          taskBoards: true,
        },
      },
    },
  });
  
  if (!project) notFound();
  
  const [financials, paymentSummary] = await Promise.all([
    calculateProjectFinancials(params.id),
    calculatePaymentSummary(params.id),
  ]);
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code}: ${project.name}`}
        description={`Managed by ${project.manager.name}`}
        backHref="/admin/projects"
        status={project.status}
        actions={[
          { label: 'Edit', href: `/admin/projects/${project.id}/edit` },
          { label: 'Export', onClick: () => {} },
        ]}
      />
      
      <ProjectDashboard 
        project={project} 
        financials={financials!} 
        paymentSummary={paymentSummary}
      />
      
      <ProjectTabs 
        project={project}
        financials={financials!}
      />
    </div>
  );
}
```

### File: `src/app/admin/(projects)/projects/[id]/edit/page.tsx`

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectForm } from '@/components/domains/projects/project-form';
import { PageHeader } from '@/components/layout/page-header';
import { getUsers } from '@/lib/data/users';
import { getSuppliers } from '@/lib/data/suppliers';

interface EditProjectPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Edit Project | DAMP',
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const [project, users, suppliers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
    }),
    getUsers({ role: 'ADMIN' }),
    getSuppliers({ status: 'APPROVED' }),
  ]);
  
  if (!project) notFound();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${project.code}`}
        backHref={`/admin/projects/${project.id}`}
      />
      
      <ProjectForm 
        project={project} 
        users={users} 
        suppliers={suppliers} 
      />
    </div>
  );
}
```

### File: `src/app/admin/(projects)/projects/[id]/budget/page.tsx`

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/page-header';
import { BudgetItemsTable } from '@/components/domains/projects/budget-items-table';
import { BudgetCategoriesPanel } from '@/components/domains/projects/budget-categories-panel';

interface BudgetPageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: 'Project Budget | DAMP',
};

export default async function BudgetPage({ params }: BudgetPageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      budgetCategories: {
        orderBy: { sortOrder: 'asc' },
      },
      budgetItems: {
        include: {
          category: true,
          supplier: { select: { id: true, name: true } },
          payments: { orderBy: { tranche: 'asc' } },
        },
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      },
    },
  });
  
  if (!project) notFound();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Budget: ${project.code}`}
        description="Manage budget categories and line items"
        backHref={`/admin/projects/${project.id}`}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <BudgetCategoriesPanel 
            projectId={project.id}
            categories={project.budgetCategories}
          />
        </div>
        <div className="lg:col-span-3">
          <BudgetItemsTable 
            projectId={project.id}
            items={project.budgetItems}
            categories={project.budgetCategories}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 7: UI Components

### File: `src/components/domains/projects/project-form.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Project, User, Supplier } from '@prisma/client';
import { projectCreateSchema, type ProjectCreateInput } from '@/lib/validations/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { DatePicker } from '@/components/ui/date-picker';

interface ProjectFormProps {
  project?: Project;
  users: User[];
  suppliers: Supplier[];
}

export function ProjectForm({ project, users, suppliers }: ProjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = !!project;
  
  const form = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      code: project?.code || '',
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'PLANNING',
      clientType: project?.clientType || 'INTERNAL',
      supplierId: project?.supplierId || null,
      clientName: project?.clientName || '',
      clientContact: project?.clientContact || '',
      contractValue: project?.contractValue?.toNumber() || undefined,
      contractCurrency: project?.contractCurrency || 'QAR',
      budgetAmount: project?.budgetAmount?.toNumber() || undefined,
      budgetCurrency: project?.budgetCurrency || 'QAR',
      startDate: project?.startDate || undefined,
      endDate: project?.endDate || undefined,
      managerId: project?.managerId || '',
      documentHandler: project?.documentHandler || '',
    },
  });
  
  const clientType = form.watch('clientType');
  
  async function onSubmit(data: ProjectCreateInput) {
    try {
      const url = isEditing ? `/api/projects/${project.id}` : '/api/projects';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save project');
      }
      
      const result = await response.json();
      
      toast({
        title: isEditing ? 'Project updated' : 'Project created',
        description: `${result.data.code} has been ${isEditing ? 'updated' : 'created'}.`,
      });
      
      router.push(`/admin/projects/${result.data.id}`);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave blank to auto-generate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Project description..." 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clientType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Internal Project</SelectItem>
                      <SelectItem value="EXTERNAL">External Client</SelectItem>
                      <SelectItem value="SUPPLIER">Supplier (from database)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {clientType === 'SUPPLIER' && (
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {clientType === 'EXTERNAL' && (
              <>
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Email or phone" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="contractValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Value (Revenue)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contractCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="QAR">QAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="budgetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="budgetCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="QAR">QAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Timeline & Ownership */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline & Ownership</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value}
                      onSelect={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value}
                      onSelect={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Manager</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentHandler"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Handler</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Name of document handler" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting 
              ? 'Saving...' 
              : isEditing ? 'Update Project' : 'Create Project'
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### File: `src/components/domains/projects/project-dashboard.tsx`

```typescript
'use client';

import { Project } from '@prisma/client';
import { ProjectFinancials, PaymentSummary } from '@/lib/domains/projects/profitability';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Receipt, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProjectDashboardProps {
  project: Project & { manager: { name: string } };
  financials: ProjectFinancials;
  paymentSummary: PaymentSummary;
}

export function ProjectDashboard({ project, financials, paymentSummary }: ProjectDashboardProps) {
  const isOverBudget = financials.isOverBudget;
  const isProfitable = financials.isProfitable;
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financials.revenue.contractValueQAR, 'QAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Contract value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financials.budgetedCostQAR, 'QAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Planned costs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Costs</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {formatCurrency(financials.actualCostQAR, 'QAR')}
              </span>
              {isOverBudget && (
                <Badge variant="destructive" className="text-xs">
                  Over Budget
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {financials.budgetUtilizationPercent}% of budget used
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financials.actualProfitQAR, 'QAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {financials.grossMarginPercent}% margin
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Budget Utilization</span>
              <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                {financials.budgetUtilizationPercent}%
              </span>
            </div>
            <Progress 
              value={Math.min(financials.budgetUtilizationPercent, 100)} 
              className={isOverBudget ? 'bg-red-100' : ''}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Target Profit</p>
              <p className="text-lg font-semibold">
                {formatCurrency(financials.targetProfitQAR, 'QAR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actual Profit</p>
              <p className={`text-lg font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financials.actualProfitQAR, 'QAR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variance</p>
              <p className={`text-lg font-semibold ${financials.budgetVarianceQAR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financials.budgetVarianceQAR, 'QAR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Paid</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(paymentSummary.paidQAR, 'QAR')}
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-xl font-bold text-yellow-700">
                {formatCurrency(paymentSummary.pendingQAR, 'QAR')}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Overdue</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(paymentSummary.overdueQAR, 'QAR')}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Reimbursement</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(paymentSummary.pendingReimbursementQAR, 'QAR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### File: `src/components/domains/projects/index.ts`

```typescript
export * from './project-form';
export * from './project-dashboard';
export * from './project-list-table';
export * from './project-list-filters';
export * from './project-tabs';
export * from './budget-items-table';
export * from './budget-item-form';
export * from './budget-categories-panel';
export * from './payment-form';
export * from './revenue-form';
```

---

## Phase 8: Sidebar Configuration

### Update: `src/components/layout/sidebar-config.ts`

Add projects to the sidebar navigation under the Projects domain:

```typescript
// Add to the projects domain group:
{
  title: 'Projects',
  href: '/admin/projects',
  icon: 'folder-kanban',  // or appropriate icon
  badge: undefined,  // Could add count of active projects
},
```

---

## Phase 9: Additional Components to Create

Create these additional components following the patterns established:

1. `src/components/domains/projects/project-list-table.tsx` - Server-side searchable table
2. `src/components/domains/projects/project-list-filters.tsx` - Filter controls
3. `src/components/domains/projects/project-tabs.tsx` - Tab navigation for project detail
4. `src/components/domains/projects/budget-items-table.tsx` - Budget items data table
5. `src/components/domains/projects/budget-item-form.tsx` - Form for creating/editing budget items
6. `src/components/domains/projects/budget-categories-panel.tsx` - Side panel for categories
7. `src/components/domains/projects/payment-form.tsx` - Payment tranche form
8. `src/components/domains/projects/revenue-form.tsx` - Revenue entry form
9. `src/components/domains/projects/project-assets-tab.tsx` - Asset allocations management
10. `src/components/domains/projects/project-subscriptions-tab.tsx` - Subscription allocations

---

## Phase 10: Testing

### File: `tests/unit/lib/validations/project.test.ts`

Create unit tests for validation schemas.

### File: `tests/integration/projects.test.ts`

Create integration tests for API routes.

### File: `tests/e2e/projects.spec.ts`

Create E2E tests for project workflows.

---

## Implementation Order

1. **Database**: Add schema changes, run migration
2. **Validations**: Create Zod schemas
3. **Domain Utils**: Create utility functions and profitability calculations
4. **Activity Log**: Add new action constants
5. **API Routes**: Implement all endpoints
6. **Pages**: Create page routes
7. **Components**: Build UI components
8. **Sidebar**: Update navigation
9. **Testing**: Add tests
10. **Documentation**: Update CLAUDE.md with new module info

---

## Notes

- All currency amounts should support multi-currency with QAR conversion
- Payment tracking supports up to 10 tranches per budget item
- Assets and Subscriptions remain standalone - project linking is optional
- Budget categories are customizable per project (not global templates)
- Profitability is calculated in real-time from linked items
- Activity logging tracks all major actions for audit trail

---

## Commands to Run After Implementation

```bash
# Format and validate schema
npx prisma format

# Generate Prisma client
npm run db:generate

# Run migration
npm run db:migrate

# Type check
npm run typecheck

# Lint
npm run lint

# Run tests
npm test
npm run test:e2e
```
