# Code Review Guides Implementation Plan

## Overview
Create comprehensive code review markdown files for 13 modules in the Durj SaaS platform, following the exact structure of `assets-module.md` and `subscriptions-module.md`.

## Modules to Document (13 total)

### Tier 1 - High Complexity
1. **employees** - Core HR module with profile management, document tracking, change requests
2. **leave** - Leave management with Qatar labor law compliance, approval workflows, balance management
3. **payroll** - Complex payroll processing with salary structures, runs, loans, gratuity, WPS integration
4. **approvals** - Multi-level approval workflow engine, policy matching, delegation support

### Tier 2 - Medium Complexity
5. **suppliers** - Vendor management with approval workflow
6. **company-documents** - Company and vehicle document management with expiry tracking
7. **asset-requests** - Asset request workflow (separate from assets module)
8. **purchase-requests** - Procurement workflow with approval integration
9. **settings** - Global organization settings and configuration

### Tier 3 - Lower Complexity
10. **users** - User/team member management with roles and HR profiles
11. **notifications** - In-app notification system with templates
12. **onboarding** - Post-signup wizard and progress tracking
13. **locations** - Physical location management for assets

## Standard Structure (from existing guides)

Each module guide must follow this exact structure:

```markdown
# [Module Name] - Code Review Guide

Complete list of all [module]-related files for code review and understanding.

---

## 1. API Routes
### [Logical Grouping 1]
| File | Description |
|------|-------------|
| [...](relative/path) | Description |

### [Logical Grouping 2]
...

---

## 2. Admin Pages (Views)
### [Feature Area]
| File | Description |
|------|-------------|
...

---

## 3. Employee Pages (Views)
[If applicable]
...

---

## 4. Components
### [Category - e.g., List & Tables]
### [Category - e.g., Actions]
### [Category - e.g., Display Components]
### [Category - e.g., Forms]
...

---

## 5. Library / Business Logic
### Domain Logic
### Utilities
...

---

## 6. Validations (Zod Schemas)
| File | Description |
...

---

## 7. Constants & Configuration
| File | Description |
...

---

## 8. Database Schema
| File | Description |
...

---

## Key Concepts to Understand
### 1. Multi-Tenant Architecture
### 2. [Module-Specific Concept 1]
### 3. [Module-Specific Concept 2]
### 4. Cross-Module Dependencies
### 5. Key Models (Prisma)
...

---

## Recommended Review Order
1. **Start with schemas**: [prisma/schema.prisma]...
2. **Understand validations**: [validations path]...
3. **Core API**: [api routes]...
4. **Business logic**: [lib path]...
5. **UI components**: [components path]...
6. **Pages**: [pages path]...
```

## Implementation Approach

### Phase 1: Simple Modules (Tier 3) - Start Here
**Order:** locations → onboarding → notifications → users

For each module:
1. Use Glob to find all files in `src/features/{module}/`
2. Use Glob to find API routes in `src/app/api/{module}/`
3. Use Glob to find admin pages in `src/app/admin/` (search for module name)
4. Use Glob to find employee pages in `src/app/employee/` (if applicable)
5. Create markdown file in `code-review/{module}-module.md`
6. Populate sections following the standard structure
7. Add cross-module dependencies in Key Concepts section

### Phase 2: Medium Complexity Modules (Tier 2)
**Order:** suppliers → company-documents → asset-requests → purchase-requests → settings

Same process as Phase 1, with additional focus on:
- Workflow diagrams for approval processes
- Integration points with other modules
- Complex business rules and validations

### Phase 3: High Complexity Modules (Tier 1)
**Order:** approvals → employees → leave → payroll

These require most detailed documentation:
- Map cross-module dependencies extensively
- Document complex workflows with flow diagrams
- Explain business rules (e.g., Qatar labor law for leave)
- Detail calculation engines (e.g., payroll, gratuity)

### Phase 4: Cross-Reference Updates
After all 13 modules are documented:
1. Review all files for consistency
2. Add cross-references between related modules
3. Verify all file paths are accurate
4. Ensure integration flows are documented in both modules

## Critical Files to Reference

- **Template:** `code-review/assets-module.md`
- **Template:** `code-review/subscriptions-module.md`
- **Schema:** `prisma/schema.prisma`
- **Context:** `CLAUDE.md`

## Cross-Module Dependencies Map

### Approvals Engine
Used by: leave, purchase-requests, asset-requests (future)
- `src/features/approvals/lib/approval-engine.ts`

### Notifications Service
Used by: leave, asset-requests, purchase-requests, company-documents, employees
- `src/features/notifications/lib/notification-service.ts`

### Employees Module
Used by: leave, payroll, assets, subscriptions
- HR profile data, leave balances, salary structures

### Leave Module
Used by: payroll (leave deduction calculations)
- `src/features/leave/lib/leave-utils.ts`

## File Naming Convention

Create files with this naming pattern:
- `code-review/approvals-module.md`
- `code-review/asset-requests-module.md`
- `code-review/company-documents-module.md`
- `code-review/employees-module.md`
- `code-review/leave-module.md`
- `code-review/locations-module.md`
- `code-review/notifications-module.md`
- `code-review/onboarding-module.md`
- `code-review/payroll-module.md`
- `code-review/purchase-requests-module.md`
- `code-review/settings-module.md`
- `code-review/suppliers-module.md`
- `code-review/users-module.md`

## Verification Steps

For each completed guide, verify:
- [ ] All sections from standard structure are present
- [ ] API routes are categorized logically
- [ ] Admin pages include loading states
- [ ] Employee pages documented (if applicable)
- [ ] Components organized by category
- [ ] Business logic files explained
- [ ] Validation schemas listed
- [ ] Constants/config files included
- [ ] Database schema reference added
- [ ] Key concepts include multi-tenancy
- [ ] Cross-module dependencies documented
- [ ] Recommended review order provided
- [ ] All file paths use relative links from code-review/
- [ ] Markdown tables properly formatted
- [ ] File length: 150-300 lines

## Execution Strategy

1. **Start with locations module** (simplest, ~3 files) to validate the approach
2. **Progress through tiers** maintaining consistency
3. **Use parallel file reads** with Glob for efficiency
4. **Follow the template structure strictly**
5. **Add cross-references** as patterns emerge
6. **Final review pass** for consistency across all 13 files

## Progress Tracking

### Completed Modules
- [x] assets (already exists, updated)
- [x] subscriptions (already exists, updated)

### Tier 3 - Completed
- [x] locations
- [x] onboarding
- [x] notifications
- [x] users

### Tier 2 - Completed
- [x] suppliers
- [x] company-documents
- [x] asset-requests
- [x] purchase-requests
- [x] settings

### Tier 1 - Completed
- [x] approvals
- [x] employees
- [x] leave
- [x] payroll

**All 13 modules documented!** (plus 2 existing = 15 total module guides)

## Expected Deliverables

13 comprehensive markdown files in `code-review/` directory, each containing:
- Complete file inventory for the module
- Categorized API routes with descriptions
- Admin and employee page listings
- Component organization breakdown
- Business logic and validation references
- Key architectural concepts
- Cross-module integration points
- Recommended review order for code reviewers

## Notes

- All exploration data has been gathered from 3 comprehensive agent runs
- File structures are well-understood for all 13 modules
- Pattern consistency with existing guides is critical
- Cross-module dependencies should flow both ways (A→B documented in both A and B guides)
- Total estimated time: 50-60 hours across all modules

## Quick Start Command

To begin implementation, start with the simplest module (locations):
1. Create `code-review/locations-module.md`
2. Follow the standard structure template
3. Use existing guides as reference for formatting
4. Validate with the verification checklist
5. Move to next tier 3 module (onboarding)
