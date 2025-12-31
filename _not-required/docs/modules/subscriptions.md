# Module: Subscriptions

## Overview

The Subscriptions module tracks SaaS subscriptions, software licenses, and recurring service contracts. Manages renewal dates, cost tracking, assignment to employees, and provides visibility into software spend across the organization.

## Features

- **Subscription Registry**: Centralized catalog of all subscriptions
- **Renewal Tracking**: Alerts before renewal dates
- **Cost Analysis**: Per-user and total cost breakdown
- **Assignment Management**: Track who has access to what
- **Lifecycle Tracking**: Active periods, cancellations, reactivations
- **Vendor Management**: Link to supplier records
- **Import/Export**: Bulk import from CSV/Excel

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/operations/subscriptions/subscription-lifecycle.ts` | Lifecycle management |
| `src/app/api/subscriptions/` | Subscription API endpoints |
| `src/components/domains/operations/subscriptions/` | Subscription UI components |

## Business Rules

### Subscription Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `ACTIVE` | Currently active subscription | CANCELLED |
| `CANCELLED` | Subscription cancelled | ACTIVE (reactivation) |

### Billing Cycles

| Cycle | Description |
|-------|-------------|
| `MONTHLY` | Billed monthly |
| `YEARLY` | Billed annually |
| `ONE_TIME` | Single purchase (perpetual license) |

### Billing Rules

1. **Activation**: Full billing cycle charged immediately
2. **Cancellation**:
   - If cancelled BEFORE renewal date: No additional charge
   - If cancelled AFTER renewal date: Full cycle charged
3. **Reactivation**: Full billing cycle charged immediately

### Cost Calculation

**Total Cost = Number of Billing Cycles × Cost per Cycle**

Billing cycles calculated based on:
- Start date of active period
- End date (cancellation or current date)
- Renewal date milestones

### Active Periods

A subscription can have multiple active periods if cancelled and reactivated:

```
Period 1: Jan 1 - Mar 15 (cancelled)
Period 2: Jun 1 - Present (reactivated)
```

Each period tracks:
- Start date
- End date (null if currently active)
- Cost incurred during period
- Renewal date at time of period

## API Endpoints

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscriptions` | List all subscriptions |
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/subscriptions/[id]` | Get subscription details |
| PUT | `/api/subscriptions/[id]` | Update subscription |
| DELETE | `/api/subscriptions/[id]` | Soft delete subscription |
| POST | `/api/subscriptions/[id]/cancel` | Cancel subscription |
| POST | `/api/subscriptions/[id]/reactivate` | Reactivate subscription |
| GET | `/api/subscriptions/[id]/cost` | Get cost breakdown |
| GET | `/api/subscriptions/[id]/periods` | Get active periods |
| GET | `/api/subscriptions/[id]/export` | Export to CSV |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscriptions/categories` | List categories |

### Import

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/subscriptions/import` | Bulk import |

## Data Flow

### Subscription Creation

1. Admin creates subscription with service details
2. Purchase date and renewal date set
3. Status set to ACTIVE
4. Initial history entry created

### Cancellation Flow

```typescript
// 1. Find subscription
const subscription = await findSubscription(id);

// 2. Validate can cancel
if (subscription.status !== 'ACTIVE') {
  throw new Error('Can only cancel ACTIVE subscriptions');
}

// 3. Update subscription
await updateSubscription(id, {
  status: 'CANCELLED',
  lastActiveRenewalDate: subscription.renewalDate,
  cancelledAt: cancellationDate
});

// 4. Create history entry
await createHistory({
  action: 'CANCELLED',
  oldStatus: 'ACTIVE',
  newStatus: 'CANCELLED',
  notes
});
```

### Reactivation Flow

```typescript
// 1. Validate can reactivate
if (subscription.status !== 'CANCELLED') {
  throw new Error('Can only reactivate CANCELLED subscriptions');
}

// 2. Update subscription
await updateSubscription(id, {
  status: 'ACTIVE',
  renewalDate: newRenewalDate,
  reactivatedAt: new Date()
});

// 3. Create history entry
await createHistory({
  action: 'REACTIVATED',
  oldStatus: 'CANCELLED',
  newStatus: 'ACTIVE',
  newRenewalDate
});
```

### Cost Calculation Flow

```typescript
// 1. Get all active periods
const periods = await getActivePeriods(subscriptionId);

// 2. Sum costs
const totalCost = periods.reduce((sum, p) => sum + p.cost, 0);

// 3. Return breakdown
return {
  totalCost,
  currency,
  billingCycle,
  activePeriods: periods
};
```

## Database Schema

### Subscription

```prisma
model Subscription {
  id                   String            @id @default(cuid())
  serviceName          String
  category             String?
  accountId            String?           // Login email/account
  purchaseDate         DateTime?
  renewalDate          DateTime?
  billingCycle         BillingCycle      @default(MONTHLY)
  costPerCycle         Decimal?
  costCurrency         String            @default("QAR")
  costQAR              Decimal?          // Cost in QAR for reporting
  vendor               String?
  status               SubscriptionStatus @default(ACTIVE)
  assignedUserId       String?
  departmentId         String?
  autoRenew            Boolean           @default(true)
  paymentMethod        String?
  notes                String?
  lastActiveRenewalDate DateTime?        // Saved on cancel
  cancelledAt          DateTime?
  reactivatedAt        DateTime?
  tenantId             String
  history              SubscriptionHistory[]
}
```

### SubscriptionHistory

```prisma
model SubscriptionHistory {
  id               String    @id @default(cuid())
  subscriptionId   String
  action           String    // CREATED, CANCELLED, REACTIVATED, REASSIGNED
  oldStatus        String?
  newStatus        String?
  oldRenewalDate   DateTime?
  newRenewalDate   DateTime?
  oldUserId        String?
  newUserId        String?
  assignmentDate   DateTime?
  reactivationDate DateTime?
  notes            String?
  performedBy      String?
  createdAt        DateTime  @default(now())
}
```

## Configuration

### Subscription Categories

Common categories:

| Category | Examples |
|----------|----------|
| PRODUCTIVITY | Microsoft 365, Google Workspace |
| DEVELOPMENT | GitHub, Jira, Confluence |
| DESIGN | Adobe Creative Cloud, Figma |
| COMMUNICATION | Slack, Zoom, Teams |
| SECURITY | LastPass, Okta |
| ANALYTICS | Tableau, Power BI |
| INFRASTRUCTURE | AWS, Azure, GCP |
| HR | Workday, BambooHR |
| FINANCE | QuickBooks, Xero |

### Payment Methods

| Method | Description |
|--------|-------------|
| CREDIT_CARD | Company credit card |
| CORPORATE_ACCOUNT | Vendor corporate account |
| DIRECT_DEBIT | Bank direct debit |
| INVOICE | Invoiced payment |

## Reporting

### Available Reports

1. **Cost by Category**: Total spend per category
2. **Cost by Department**: Spend breakdown by department
3. **Cost per User**: Average subscription cost per employee
4. **Upcoming Renewals**: Subscriptions renewing in next 30/60/90 days
5. **Utilization Report**: Assigned vs unassigned subscriptions

### Export Formats

- CSV
- Excel (XLSX)
- PDF (summary report)

## Security Considerations

- **Access Control**: Sensitive account IDs visible only to ADMIN
- **Cost Data**: Financial data restricted by role
- **Vendor Credentials**: Stored encrypted
- **Audit Trail**: Full history of changes

## Import Format

CSV/Excel import supports columns:

| Column | Required | Description |
|--------|----------|-------------|
| serviceName | Yes | Subscription name |
| category | No | Category code |
| purchaseDate | No | YYYY-MM-DD format |
| renewalDate | No | YYYY-MM-DD format |
| billingCycle | No | MONTHLY, YEARLY, ONE_TIME |
| costPerCycle | No | Numeric |
| costCurrency | No | 3-letter code (default: QAR) |
| vendor | No | Vendor name |
| accountId | No | Login/account email |
| assignedUserId | No | User ID to assign to |

## Future Enhancements

- [ ] Integration with vendor APIs for auto-discovery
- [ ] License compliance tracking
- [ ] Automatic renewal reminders via email
- [ ] Cost optimization recommendations
- [ ] Contract document storage
- [ ] Multi-year contract tracking
