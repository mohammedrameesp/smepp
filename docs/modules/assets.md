# Module: Assets

## Overview

The Assets module provides comprehensive fixed asset management including acquisition, assignment, maintenance tracking, depreciation calculations, and disposal. Supports both physical and digital assets with configurable lifecycle stages.

## Features

- **Asset Registry**: Centralized catalog of all organizational assets
- **Assignment Tracking**: Assign assets to employees/departments
- **Depreciation Engine**: Automated straight-line depreciation calculations
- **Maintenance Scheduling**: Track maintenance history and schedules
- **Lifecycle Management**: Track status from acquisition to disposal
- **Asset Requests**: Employees can request new assets or changes
- **Import/Export**: Bulk import from CSV/Excel

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/operations/assets/depreciation/calculator.ts` | Depreciation calculation engine |
| `src/lib/domains/operations/assets/depreciation/service.ts` | Depreciation batch processing |
| `src/lib/domains/operations/assets/asset-lifecycle.ts` | Asset status transitions |
| `src/lib/domains/operations/assets/asset-utils.ts` | Utility functions |
| `src/lib/domains/operations/assets/asset-history.ts` | History logging |
| `src/app/api/assets/` | Asset API endpoints |
| `src/components/domains/operations/assets/` | Asset UI components |

## Business Rules

### Asset Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `AVAILABLE` | Unassigned, ready for use | ASSIGNED, UNDER_MAINTENANCE, DISPOSED |
| `ASSIGNED` | Currently assigned to someone | AVAILABLE, UNDER_MAINTENANCE, DISPOSED |
| `UNDER_MAINTENANCE` | In maintenance/repair | AVAILABLE, ASSIGNED, DISPOSED |
| `DISPOSED` | No longer in use | (terminal state) |

### Depreciation Method

**Straight-Line Depreciation** (IFRS compliant)

```
Monthly Depreciation = (Acquisition Cost - Salvage Value) / Useful Life Months
```

**Key Rules:**
- Salvage value represents estimated residual value at end of useful life
- Useful life configured per asset category (default: 5 years = 60 months)
- Pro-rata calculation for mid-month acquisitions
- Depreciation stops when accumulated equals depreciable amount

### Pro-Rata First Month

When an asset is acquired mid-month, first month depreciation is pro-rated:

```
Pro-Rata Factor = Days Remaining in Month / Days in Month
First Month Depreciation = Monthly Depreciation × Pro-Rata Factor
```

**Example:** Asset acquired on Jan 15 (31-day month):
- Days remaining: 17
- Pro-rata factor: 17/31 = 0.548
- If monthly is 1800, first month = 986.45

### Qatar Tax Depreciation Rates

| Asset Category | Tax Useful Life | Annual Rate |
|----------------|-----------------|-------------|
| Buildings | 20 years | 5% |
| Machinery & Equipment | 10 years | 10% |
| Vehicles | 5 years | 20% |
| Furniture & Fixtures | 10 years | 10% |
| Computer Equipment | 3-5 years | 20-33% |
| Software | 3 years | 33% |

### Shared/Common Assets

Assets can be marked as "shared" (isShared: true) when they are:
- Used by multiple employees/departments
- Not assigned to a specific person
- Company-wide resources (printers, meeting room equipment)

## API Endpoints

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Create new asset |
| GET | `/api/assets/[id]` | Get asset details |
| PUT | `/api/assets/[id]` | Update asset |
| DELETE | `/api/assets/[id]` | Soft delete asset |
| POST | `/api/assets/[id]/assign` | Assign to user |
| POST | `/api/assets/[id]/clone` | Duplicate asset |
| GET | `/api/assets/[id]/history` | Get change history |

### Depreciation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets/[id]/depreciation` | Get current depreciation |
| GET | `/api/assets/[id]/depreciation/schedule` | Full depreciation schedule |
| POST | `/api/assets/[id]/depreciation` | Record monthly depreciation |

### Maintenance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets/[id]/maintenance` | Get maintenance history |
| POST | `/api/assets/[id]/maintenance` | Log maintenance event |

### Asset Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/asset-requests` | List asset requests |
| POST | `/api/asset-requests` | Create new request |
| POST | `/api/asset-requests/[id]/approve` | Approve request |
| POST | `/api/asset-requests/[id]/reject` | Reject request |

### Categories & Types

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets/categories` | List asset categories |
| GET | `/api/assets/types` | List asset types |
| GET | `/api/assets/locations` | List locations |

## Data Flow

### Asset Creation

1. Admin creates asset with acquisition details
2. System initializes depreciation (if depreciable)
3. Asset status set to AVAILABLE
4. History entry created

### Assignment Flow

1. Admin/Manager assigns asset to employee
2. Previous assignment ended (if any)
3. New assignment created
4. Status updated to ASSIGNED
5. Notifications sent

### Depreciation Recording

1. Cron job runs monthly (or manual trigger)
2. For each depreciable asset:
   - Check if period already processed
   - Calculate monthly depreciation
   - Apply pro-rata for first/last months
   - Update accumulated depreciation
   - Create depreciation record

## Testing

### Unit Tests

- `tests/unit/lib/assets/depreciation-calculator.test.ts` - 38 tests covering:
  - Monthly depreciation calculation
  - Schedule generation
  - Summary statistics
  - Pro-rata calculations
  - Edge cases

### Test Coverage Areas

**Depreciation Calculation:**
- Standard monthly calculation
- Pro-rata first month
- Capping at depreciable amount
- Zero/invalid inputs

**Schedule Generation:**
- Full schedule length
- Cumulative values
- Partial depreciation

**Summary Statistics:**
- Remaining months
- Percent depreciated
- Net book value

### Running Tests

```bash
# All asset tests
npx jest tests/unit/lib/assets/

# Depreciation calculator only
npx jest tests/unit/lib/assets/depreciation-calculator.test.ts
```

## Database Schema

### Asset

```prisma
model Asset {
  id                    String      @id @default(cuid())
  assetCode             String      @unique
  name                  String
  description           String?
  category              String      // EQUIPMENT, VEHICLE, FURNITURE, etc.
  type                  String?     // Subcategory
  status                AssetStatus @default(AVAILABLE)

  // Acquisition
  acquisitionDate       DateTime
  acquisitionCost       Decimal
  purchaseOrderNumber   String?
  vendor                String?

  // Depreciation
  usefulLifeMonths      Int?
  salvageValue          Decimal?
  depreciationStartDate DateTime?
  accumulatedDepreciation Decimal   @default(0)
  lastDepreciationDate  DateTime?

  // Assignment
  assignedUserId        String?
  assignedUser          User?       @relation(...)
  departmentId          String?
  location              String?
  isShared              Boolean     @default(false)

  // Warranty
  warrantyExpiry        DateTime?
  warrantyNotes         String?

  tenantId              String
}
```

### DepreciationRecord

```prisma
model DepreciationRecord {
  id                 String   @id @default(cuid())
  assetId            String
  periodStart        DateTime
  periodEnd          DateTime
  amount             Decimal
  accumulatedAmount  Decimal
  netBookValue       Decimal
  proRataFactor      Decimal  @default(1)
  tenantId           String
}
```

## Configuration

### Asset Categories

Organizations can configure custom categories in settings:

```json
{
  "categories": [
    { "code": "EQUIPMENT", "name": "Equipment", "usefulLifeMonths": 60 },
    { "code": "VEHICLE", "name": "Vehicles", "usefulLifeMonths": 60 },
    { "code": "FURNITURE", "name": "Furniture", "usefulLifeMonths": 120 },
    { "code": "IT", "name": "IT Equipment", "usefulLifeMonths": 36 },
    { "code": "SOFTWARE", "name": "Software", "usefulLifeMonths": 36 }
  ]
}
```

### Asset Code Format

Auto-generated codes follow pattern: `{PREFIX}-{YEAR}-{SEQUENCE}`

Example: `AST-2024-00001`

## Security Considerations

- **Role-Based Access**: Only ADMIN/MANAGER can create/modify assets
- **Tenant Isolation**: All queries filtered by tenantId
- **Assignment History**: Full audit trail of assignments
- **Financial Data**: Depreciation values logged for accounting

## Import Format

CSV/Excel import supports columns:

| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Asset name |
| category | Yes | Category code |
| acquisitionDate | Yes | YYYY-MM-DD format |
| acquisitionCost | Yes | Numeric |
| serialNumber | No | Unique identifier |
| location | No | Physical location |
| usefulLifeMonths | No | Defaults to category default |
| salvageValue | No | Defaults to 0 |

## Future Enhancements

- [ ] Barcode/QR code scanning
- [ ] Asset check-in/check-out workflow
- [ ] Automated warranty expiry alerts
- [ ] Integration with accounting systems
- [ ] Asset valuation reports
