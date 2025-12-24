# Tenant Onboarding & Super-Admin UX Overhaul

## Overview
Complete overhaul of tenant onboarding wizard and super-admin experience using **Linear-style minimal design** (one input per step, animated transitions, progress indicator) with **module selection** and **persistent dashboard checklist**.

### Key Decisions:
- **No tier system** - All modules available, client chooses what they need
- **Qatar-based** - Timezone hardcoded to Asia/Qatar (UTC+3)
- **Multi-currency** - QAR as primary, option to add additional currencies (USD, EUR, etc.)

---

## Phase 1: Database Schema Changes

### Add to `prisma/schema.prisma`:

```prisma
// Add to Organization model
model Organization {
  // ... existing fields ...

  // Module configuration (client chooses which to enable)
  enabledModules        String[]  @default([])

  // Currency configuration (QAR is always primary, these are additional)
  additionalCurrencies  String[]  @default([])  // e.g., ["USD", "EUR"]

  // Onboarding tracking
  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?
  onboardingStep        Int       @default(0)
}

// Note: timezone will be hardcoded to "Asia/Qatar" (UTC+3) - no DB field needed

// New model for checklist
model OrganizationSetupProgress {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  profileComplete        Boolean @default(false)
  logoUploaded           Boolean @default(false)
  brandingConfigured     Boolean @default(false)
  firstAssetAdded        Boolean @default(false)
  firstTeamMemberInvited Boolean @default(false)
  firstEmployeeAdded     Boolean @default(false)
  firstProjectCreated    Boolean @default(false)

  isDismissed Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Phase 2: New Onboarding Wizard (Linear-Style)

### File Structure:
```
src/
  app/
    onboarding/
      page.tsx                    # Main wizard page (replace redirect)
      layout.tsx                  # Minimal centered layout
  components/
    onboarding/
      wizard/
        OnboardingWizard.tsx      # Main orchestrator
        OnboardingProgress.tsx    # Top progress bar
        StepContainer.tsx         # Animated step wrapper
        steps/
          OrganizationBasicsStep.tsx   # Step 1
          BrandingStep.tsx             # Step 2
          ModuleSelectionStep.tsx      # Step 3
          TeamSetupStep.tsx            # Step 4
          WelcomeStep.tsx              # Step 5
        shared/
          StepHeader.tsx
          StepNavigation.tsx
          ModuleCard.tsx
```

### Step Flow:

| Step | Title | Inputs | Skip? |
|------|-------|--------|-------|
| 1 | Organization Basics | Name, Additional Currencies (multi-select) | No |
| 2 | Branding | Logo, Primary Color, Secondary Color | Yes |
| 3 | Enable Modules | Toggle cards for ALL available modules | No |
| 4 | Invite Team | Email + Role (multi-add) | Yes |
| 5 | Welcome | Success message, Dashboard link | - |

### Step 1 Details - Organization Basics:
- **Organization Name**: Pre-filled from creation, editable
- **Primary Currency**: QAR (fixed, shown but not editable)
- **Additional Currencies**: Multi-select dropdown
  - USD (US Dollar)
  - EUR (Euro)
  - GBP (British Pound)
  - SAR (Saudi Riyal)
  - AED (UAE Dirham)
  - KWD (Kuwaiti Dinar)
  - BHD (Bahraini Dinar)
  - OMR (Omani Rial)
- **Timezone**: Displayed as "Asia/Qatar (UTC+3)" - not editable

### Module Selection Options (ALL Available - No Tier Restrictions):

**Operations:**
- Assets - Track company assets, assignments, maintenance
- Subscriptions - Manage software subscriptions and renewals
- Suppliers - Vendor management and engagement tracking

**HR:**
- Employees - Employee profiles and HR data
- Leave Management - Leave types, balances, requests
- Payroll - Salary structures, payslips, loans

**Projects & Procurement:**
- Projects - Project management with tasks
- Purchase Requests - Procurement workflow with approvals
- Approvals - Multi-level approval workflows

**Documents:**
- Company Documents - Document management with expiry tracking

---

## Phase 3: Dashboard Setup Checklist Widget

### File Structure:
```
src/
  components/
    dashboard/
      setup-checklist/
        SetupChecklistWidget.tsx
        ChecklistItem.tsx
        ChecklistProgress.tsx
  hooks/
    use-setup-progress.ts
  app/
    api/
      organizations/
        setup-progress/
          route.ts
```

### Checklist Items:
| Item | Trigger Condition | Action Link |
|------|-------------------|-------------|
| Complete org profile | timezone + currency set | /admin/organization |
| Upload company logo | logoUrl exists | /admin/organization |
| Configure branding | primaryColor != default | /admin/organization |
| Add first asset | assets.count > 0 | /admin/assets/new |
| Invite team member | invitations.count > 0 | /admin/team |
| Add first employee | hrProfiles.count > 0 | /admin/employees/new |
| Create first project | projects.count > 0 | /admin/projects/new |

### Integration:
- Add to `src/app/admin/page.tsx` dashboard
- Collapsible card with progress ring
- Dismiss button after completion

---

## Phase 4: Super-Admin Enhancements

### 4.1 Platform Settings (Replace Placeholder)
**File:** `src/app/super-admin/settings/page.tsx`

**Sections:**
1. General Settings - Platform name, support email
2. Available Modules - Enable/disable modules globally
3. Available Currencies - Manage currency options for organizations
4. Default Limits - User and asset limits per organization

### 4.2 Enhanced Organization Details
**File:** `src/app/super-admin/organizations/[id]/page.tsx`

**New Tabs:**
- Overview (current)
- Settings (branding, modules, currencies)
- Limits (user/asset limits override)
- Activity (audit log)

### 4.3 Organization Module Manager
**File:** `src/components/super-admin/OrganizationModuleManager.tsx`

- View enabled modules for organization
- Enable/disable modules per organization
- Bulk enable common module sets

### 4.4 Analytics Dashboard (New)
**File:** `src/app/super-admin/analytics/page.tsx`

- Total orgs/users over time (line chart)
- Module usage breakdown (which modules are most popular)
- Organizations by enabled modules
- Storage utilization

---

## Phase 5: API Endpoints

### New Endpoints:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/organizations/onboarding` | GET/PATCH | Onboarding state |
| `/api/organizations/setup-progress` | GET/PATCH | Checklist progress |
| `/api/organizations/modules` | GET/PATCH | Enable/disable modules |
| `/api/organizations/currencies` | GET/PATCH | Additional currencies config |
| `/api/organizations/branding` | PATCH | Update branding |
| `/api/super-admin/platform-settings` | GET/PATCH | Platform config |
| `/api/super-admin/analytics` | GET | Platform analytics |
| `/api/super-admin/organizations/[id]/modules` | PATCH | Override org modules |
| `/api/super-admin/organizations/[id]/limits` | PATCH | Override org limits |

---

## Implementation Order

### Week 1: Foundation
1. [ ] Schema changes + migration
2. [ ] Onboarding API endpoints
3. [ ] Setup progress API endpoints

### Week 2: Onboarding Wizard
4. [ ] OnboardingWizard container + layout
5. [ ] Progress bar + step animations
6. [ ] Step 1: Organization Basics
7. [ ] Step 2: Branding (logo + colors)
8. [ ] Step 3: Module Selection
9. [ ] Step 4: Team Setup
10. [ ] Step 5: Welcome

### Week 3: Dashboard & Super-Admin
11. [ ] Setup Checklist Widget
12. [ ] Integrate checklist into dashboard
13. [ ] Platform Settings page
14. [ ] Organization detail enhancements
15. [ ] Subscription tier manager

### Week 4: Polish
16. [ ] Analytics dashboard
17. [ ] Mobile responsiveness
18. [ ] Accessibility audit
19. [ ] Testing & bug fixes

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add enabledModules, additionalCurrencies, onboarding fields, SetupProgress model |
| `src/app/onboarding/page.tsx` | Replace redirect with wizard |
| `src/app/admin/page.tsx` | Add SetupChecklistWidget |
| `src/app/super-admin/settings/page.tsx` | Replace placeholder with full settings |
| `src/lib/multi-tenant/feature-flags.ts` | Update to check enabledModules instead of tier |
| `src/lib/core/auth.ts` | Add enabledModules to session |
| `src/lib/constants.ts` | Add AVAILABLE_CURRENCIES and AVAILABLE_MODULES constants |

---

## Design Specifications

### Animation (CSS Transitions):
```css
/* Step transitions */
.step-enter { opacity: 0; transform: translateX(20px); }
.step-enter-active { opacity: 1; transform: translateX(0); transition: 300ms ease-out; }
.step-exit { opacity: 0; transform: translateX(-20px); transition: 300ms ease-out; }
```

### Color Palette for Module Cards:
- Operations (Assets, Subs, Suppliers): Blue gradient
- HR (Employees, Leave, Payroll): Green gradient
- Projects & Procurement: Purple gradient
- Documents: Orange gradient
- Selected state: Solid color with checkmark
- Unselected state: Light border, muted colors

### Progress Indicator:
- Horizontal bar at top
- Filled segments for completed steps
- Current step highlighted
- Step numbers: 1 → 2 → 3 → 4 → 5

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| Schema + APIs | 6h |
| Onboarding Wizard | 15h |
| Dashboard Checklist | 5h |
| Super-Admin Enhancements | 12h |
| Polish & Testing | 6h |
| **Total** | **~44h** |

---

## Research Sources

### Top SaaS Onboarding Patterns Analyzed:
- **Notion** - Lightweight onboarding (<50 seconds), use-case driven templates
- **Slack** - 3-step contextualized setup, Slackbot guidance
- **Asana** - 30-day structured program, template-based
- **Monday.com** - Workspace templates, managed workspaces
- **Linear** - One input per step, 72% completion rate
- **Figma** - Animated tooltips, multi-modal learning

### Best Practices Applied:
1. Progressive disclosure - reveal features gradually
2. 3-5 step wizard maximum
3. Role-based onboarding paths
4. Sample data/templates to reduce blank-slate anxiety
5. Interactive checklists for progress tracking
6. Team invitation early in flow (step 2-3)
