# Project Budget Tracking Removal Prompt

Use this prompt with Claude Code to completely remove the Project Budget Tracking module from DAMP without affecting other modules.

---

## Prompt

```
I need to completely remove the Project Budget Tracking feature from this codebase. This includes budget categories, budget items, payment tranches, revenue tracking, and all related accounting features.

IMPORTANT RULES:
1. Keep the basic Project model for task boards and accreditation - only remove budget/financial tracking
2. Keep ALL simple projectId references in other modules (Board, AccreditationProject, PurchaseRequest)
3. Only remove the junction tables that handle COST ALLOCATION

## What to Remove

### 1. Prisma Schema (prisma/schema.prisma)

DELETE these models entirely:
- ProjectBudgetCategory
- ProjectBudgetItem
- ProjectPayment
- ProjectRevenue
- ProjectAsset (junction table for asset cost allocation)
- ProjectSubscription (junction table for subscription cost allocation)

DELETE these enums:
- BudgetItemStatus
- PaymentStatus
- PaymentTrancheStatus
- RevenueStatus
- AssetCostType
- SubscriptionCostType

MODIFY the Project model - remove these fields:
- budgetTotal
- budgetUsed
- revenueTarget
- revenueActual
- budgetCategories (relation to ProjectBudgetCategory)
- budgetItems (relation to ProjectBudgetItem)
- revenues (relation to ProjectRevenue)
- assetAllocations (relation to ProjectAsset)
- subscriptionAllocations (relation to ProjectSubscription)

MODIFY the Asset model - remove:
- projectAllocations (relation to ProjectAsset junction table)

MODIFY the Subscription model - remove:
- projectAllocations (relation to ProjectSubscription junction table)

MODIFY the PurchaseRequest model - remove:
- budgetItems (relation to ProjectBudgetItem)
- KEEP projectId and project relation! (simple project assignment stays)

MODIFY the Supplier model - remove:
- budgetItems (relation to ProjectBudgetItem if exists)

MODIFY the User model - remove these relations:
- createdBudgetItems
- createdProjectPayments
- createdProjectRevenues
- createdProjectAssets
- createdProjectSubscriptions

### 2. DO NOT TOUCH - Keep These Relations

KEEP these simple projectId links (they allow assigning to a project without cost tracking):
- Board.projectId + Board.project (task boards linked to projects)
- AccreditationProject.projectId + AccreditationProject.project (accreditation linked to projects)
- PurchaseRequest.projectId + PurchaseRequest.project (purchase requests linked to projects)
- Project.accreditationProjects relation
- Project.boards relation
- Project.purchaseRequests relation

### 3. API Routes to Delete

Delete these entire directories:
- src/app/api/projects/[id]/budget/
- src/app/api/projects/[id]/budget-categories/
- src/app/api/projects/[id]/budget-items/
- src/app/api/projects/[id]/payments/
- src/app/api/projects/[id]/revenue/
- src/app/api/projects/[id]/assets/ (cost allocation API, not asset module)
- src/app/api/projects/[id]/subscriptions/ (cost allocation API, not subscription module)

DO NOT DELETE:
- src/app/api/assets/ (main asset module - unrelated)
- src/app/api/subscriptions/ (main subscription module - unrelated)
- src/app/api/accreditation/ (accreditation module - uses simple projectId)

### 4. Admin Pages to Delete

Delete these pages/directories:
- src/app/admin/projects/[id]/budget/
- src/app/admin/projects/[id]/revenue/
- src/app/admin/projects/[id]/assets/ (project cost allocation page)
- src/app/admin/projects/[id]/subscriptions/ (project cost allocation page)

Update these pages to remove budget references:
- src/app/admin/projects/page.tsx (remove budget columns from table)
- src/app/admin/projects/[id]/page.tsx (remove budget tabs/sections)
- src/app/admin/projects/new/page.tsx (remove budget fields from form)
- src/app/admin/projects/[id]/edit/page.tsx (remove budget fields)

DO NOT DELETE:
- src/app/admin/assets/ (main asset module pages)
- src/app/admin/subscriptions/ (main subscription module pages)
- src/app/admin/accreditation/ (accreditation module pages)

### 5. Components to Delete

Delete budget-related components:
- src/components/domains/projects/budget/ (entire directory if exists)
- Any ProjectBudget*, BudgetCategory*, BudgetItem*, ProjectRevenue* components
- Any ProjectAsset*, ProjectSubscription* components related to cost allocation

DO NOT DELETE:
- src/components/domains/operations/assets/ (main asset components)
- src/components/domains/operations/subscriptions/ (main subscription components)
- src/components/domains/projects/accreditation/ (accreditation components)

### 6. Lib/Validation Files

Delete or update:
- src/lib/validations/projects/budget.ts (delete if exists)
- src/lib/validations/projects.ts (remove budget schemas only, keep basic project schemas)

### 7. After Code Changes

Run these commands:
1. npx prisma format
2. npx prisma migrate dev --name remove_project_budget_tracking
3. npm run typecheck (fix any TypeScript errors)
4. npm run build (verify build succeeds)

### 8. Verification Checklist

After removal, verify these STILL WORK:
- [ ] Projects can still be created with basic info (name, code, status, dates)
- [ ] Task boards still show project dropdown (Board.projectId works)
- [ ] Accreditation projects can still link to projects (AccreditationProject.projectId works)
- [ ] Purchase requests can still link to projects (PurchaseRequest.projectId works)
- [ ] Assets module works independently (no project cost tracking)
- [ ] Subscriptions module works independently (no project cost tracking)

After removal, verify these are GONE:
- [ ] No budget columns in project list
- [ ] No budget tabs on project detail page
- [ ] No revenue tracking anywhere
- [ ] No "allocate asset cost to project" feature
- [ ] No "allocate subscription cost to project" feature
- [ ] Build passes with no errors
- [ ] TypeScript has no errors

Please proceed with these changes systematically, starting with the Prisma schema, then API routes, then pages and components.
```

---

## Summary of Changes

### Models to DELETE (6 models)
| Model | Purpose | Action |
|-------|---------|--------|
| `ProjectBudgetCategory` | Budget category grouping | DELETE |
| `ProjectBudgetItem` | Individual budget line items | DELETE |
| `ProjectPayment` | Payment tranches tracking | DELETE |
| `ProjectRevenue` | Revenue/invoice tracking | DELETE |
| `ProjectAsset` | Asset cost allocation junction | DELETE |
| `ProjectSubscription` | Subscription cost allocation junction | DELETE |

### Enums to DELETE (6 enums)
| Enum | Action |
|------|--------|
| `BudgetItemStatus` | DELETE |
| `PaymentStatus` | DELETE |
| `PaymentTrancheStatus` | DELETE |
| `RevenueStatus` | DELETE |
| `AssetCostType` | DELETE |
| `SubscriptionCostType` | DELETE |

### Relations to KEEP (Critical - Do Not Remove)
| Model | Field | Purpose |
|-------|-------|---------|
| `Board` | `projectId`, `project` | Links task boards to projects |
| `AccreditationProject` | `projectId`, `project` | Links accreditation to projects |
| `PurchaseRequest` | `projectId`, `project` | Links purchase requests to projects |

### Relations to REMOVE
| Model | Field | Purpose |
|-------|-------|---------|
| `Asset` | `projectAllocations` | Cost allocation junction |
| `Subscription` | `projectAllocations` | Cost allocation junction |
| `PurchaseRequest` | `budgetItems` | Link to budget items |
| `Project` | `budgetCategories`, `budgetItems`, `revenues`, `assetAllocations`, `subscriptionAllocations` | Budget tracking |

---

## Files to DELETE

### API Routes
```
src/app/api/projects/[id]/budget/
src/app/api/projects/[id]/budget-categories/
src/app/api/projects/[id]/budget-items/
src/app/api/projects/[id]/payments/
src/app/api/projects/[id]/revenue/
src/app/api/projects/[id]/assets/
src/app/api/projects/[id]/subscriptions/
```

### Admin Pages
```
src/app/admin/projects/[id]/budget/
src/app/admin/projects/[id]/revenue/
src/app/admin/projects/[id]/assets/
src/app/admin/projects/[id]/subscriptions/
```

---

## Files to KEEP (Do Not Touch)

### Asset Module (Standalone)
```
src/app/api/assets/           ✓ KEEP
src/app/admin/assets/         ✓ KEEP
src/components/domains/operations/assets/  ✓ KEEP
```

### Subscription Module (Standalone)
```
src/app/api/subscriptions/    ✓ KEEP
src/app/admin/subscriptions/  ✓ KEEP
src/components/domains/operations/subscriptions/  ✓ KEEP
```

### Accreditation Module (Uses Simple projectId)
```
src/app/api/accreditation/    ✓ KEEP
src/app/admin/accreditation/  ✓ KEEP
src/components/domains/projects/accreditation/  ✓ KEEP
```

---

## Expected Result

After running this prompt, the Projects module will be simplified to:
- Basic project info (name, code, description, status, dates, manager)
- Simple linking to task boards (Board.projectId)
- Simple linking to accreditation projects (AccreditationProject.projectId)
- Simple linking to purchase requests (PurchaseRequest.projectId)

**Removed:**
- Budget categories and line items
- Payment tranche tracking
- Revenue/invoice tracking
- Asset cost allocation to projects
- Subscription cost allocation to projects

This aligns with the SME Product Strategy recommendation to remove complex enterprise accounting features while keeping simple project assignment functionality.
