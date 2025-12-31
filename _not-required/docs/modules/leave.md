# Module: Leave Management

## Overview

The Leave module provides comprehensive leave management for Qatar-based organizations, fully compliant with Qatar Labor Law (Law No. 14 of 2004). It handles leave type configuration, balance tracking, request workflow, and pro-rata accruals.

## Features

- **Leave Types**: Configurable leave types (Annual, Sick, Maternity, Paternity, Hajj, etc.)
- **Balance Tracking**: Real-time balance with entitlement, used, pending, carried forward
- **Pro-rata Accrual**: Monthly accrual for new employees joining mid-year
- **Service-based Entitlement**: Automatic entitlement upgrades based on service duration
- **Approval Workflow**: Request → Approve/Reject with optional manager delegation
- **Calendar View**: Visual calendar showing team leave schedules
- **Overlap Detection**: Prevents conflicting leave requests

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/hr/leave/leave-utils.ts` | Core utility functions, business rules |
| `src/lib/domains/hr/leave/leave-balance-init.ts` | Balance initialization for new employees |
| `src/app/api/leave/` | Leave API endpoints |
| `src/components/domains/hr/leave/` | Leave UI components |

## Business Rules

### Qatar Labor Law Compliance

#### Annual Leave (Article 79)

| Service Duration | Entitlement |
|------------------|-------------|
| < 1 year | Pro-rata accrual (21 days/year ÷ 12 × months worked) |
| 1-5 years | 21 working days |
| 5+ years | 28 working days |

**Key Rules:**
- Accrues monthly from day one (pro-rata)
- Includes weekends when counting calendar days
- Up to 5 days carry forward allowed
- Minimum 7 days advance notice required

#### Sick Leave (Article 81)

| Tier | Duration | Pay Rate |
|------|----------|----------|
| Full Pay | First 14 days | 100% |
| Half Pay | Next 28 days | 50% |
| Unpaid | Remaining 42 days | 0% |

**Key Rules:**
- Requires medical certificate
- Eligible after 3 months of service
- 84 days maximum per year (14 + 28 + 42)

#### Maternity Leave (Article 96)

- **Duration**: 50 days (up to 15 before delivery)
- **Pay**: Full pay if 1+ year of service, otherwise unpaid
- **Notice**: 14 days minimum
- **Gender**: Female employees only

#### Paternity Leave

- **Duration**: 3 days
- **Pay**: Full pay
- **Gender**: Male employees only

#### Hajj Leave (Article 84)

- **Duration**: Up to 20 days unpaid
- **Frequency**: Once during employment
- **Eligibility**: 12 months minimum service
- **Notice**: 30 days minimum

### Qatar Weekend

The system uses Qatar's official weekend:
- **Friday**: Weekend day (day 5)
- **Saturday**: Weekend day (day 6)
- **Sunday-Thursday**: Working days

Working days calculation excludes Friday and Saturday unless the leave type specifically includes weekends (e.g., Annual Leave which counts calendar days).

### Balance Calculation Formula

```
Remaining = Entitlement + CarriedForward + Adjustment - Used - Pending
Available = Entitlement + CarriedForward + Adjustment - Used
```

### Pro-rata Accrual (FIN-008)

For employees joining mid-year:

```
ProRataEntitlement = (RemainingMonths / 12) × FullEntitlement
RemainingMonths = 12 - JoinMonth
```

Example: Employee joining in July gets 6/12 × 21 = 10.5 days (rounded to nearest 0.5).

## Leave Categories

| Category | Auto-Initialize | Assignment |
|----------|-----------------|------------|
| STANDARD | Yes | Automatic for all employees |
| MEDICAL | Yes | Automatic after service requirement |
| PARENTAL | No | Admin assigns based on gender |
| RELIGIOUS | No | Admin assigns when requested |

## API Endpoints

### Leave Types

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leave/types` | List all leave types |
| POST | `/api/leave/types` | Create leave type |
| GET | `/api/leave/types/[id]` | Get leave type details |
| PUT | `/api/leave/types/[id]` | Update leave type |
| DELETE | `/api/leave/types/[id]` | Delete leave type |

### Leave Balances

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leave/balances` | List user's leave balances |
| GET | `/api/leave/balances/[id]` | Get specific balance |
| PUT | `/api/leave/balances/[id]` | Admin adjust balance |

### Leave Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leave/requests` | List leave requests |
| POST | `/api/leave/requests` | Submit new request |
| GET | `/api/leave/requests/[id]` | Get request details |
| PUT | `/api/leave/requests/[id]` | Update request |
| POST | `/api/leave/requests/[id]/approve` | Approve request |
| POST | `/api/leave/requests/[id]/reject` | Reject request |
| POST | `/api/leave/requests/[id]/cancel` | Cancel request |

### Calendar

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leave/calendar` | Get leave calendar data |

## Data Flow

### Leave Request Workflow

```
PENDING → APPROVED → (Leave taken)
    ↓         ↓
 REJECTED  CANCELLED
```

**State Transitions:**
1. **Submit**: Employee creates request → Status: PENDING, balance.pending updated
2. **Approve**: Manager approves → Status: APPROVED, balance.pending → balance.used
3. **Reject**: Manager rejects → Status: REJECTED, balance.pending released
4. **Cancel**: Employee cancels → Status: CANCELLED, balance.pending released

### Balance Initialization Flow

1. **New Employee Created**:
   - `initializeUserLeaveBalances()` called
   - Creates balances for STANDARD and MEDICAL categories
   - Skips PARENTAL and RELIGIOUS (admin assigns)

2. **HR Profile Updated**:
   - `reinitializeUserLeaveBalances()` called
   - Recalculates entitlements based on new join date
   - Updates balances if nothing used yet

3. **Year Rollover**:
   - New balances created for new year
   - Carry forward from previous year applied

### Request Validation Flow

1. **Date Validation**:
   - Start date must be in future
   - End date >= Start date
   - No overlap with existing approved requests

2. **Balance Validation**:
   - Requested days <= Available balance
   - Request type matches leave type rules

3. **Business Rules**:
   - Notice days requirement
   - Maximum consecutive days
   - Service requirement met
   - Document attached (if required)

## Testing

### Unit Tests

- `tests/unit/lib/leave/leave-utils.test.ts` - 99 tests covering:
  - Service duration calculations
  - Qatar Labor Law entitlements
  - Working days calculation (Qatar weekend)
  - Sick leave pay breakdown
  - Balance calculations
  - Date overlap detection
  - Request validation

### Test Coverage Areas

**Service Duration:**
- Month/year calculations
- Partial months handling
- Leap year handling

**Entitlements:**
- Service-based tiers (21/28 days)
- Pro-rata for mid-year joiners
- Sick leave pay tiers

**Working Days:**
- Qatar weekend (Fri/Sat)
- Half-day handling
- Calendar vs working days

**Validation:**
- Cancel/edit eligibility
- Notice days requirement
- Max consecutive days

### Running Tests

```bash
# All leave tests
npx jest tests/unit/lib/leave/

# Specific test file
npx jest tests/unit/lib/leave/leave-utils.test.ts

# With coverage
npm run test:unit -- tests/unit/lib/leave/ --coverage
```

## Configuration

### Leave Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Leave type name |
| `description` | string | Description text |
| `defaultDays` | number | Annual entitlement |
| `color` | string | Display color (hex) |
| `isPaid` | boolean | Whether leave is paid |
| `requiresApproval` | boolean | Needs manager approval |
| `requiresDocument` | boolean | Needs attachment |
| `allowCarryForward` | boolean | Allows year-to-year carry |
| `maxCarryForwardDays` | number | Max days to carry |
| `minNoticeDays` | number | Advance notice required |
| `maxConsecutiveDays` | number | Max days per request |
| `minimumServiceMonths` | number | Service required |
| `isOnceInEmployment` | boolean | One-time leave (e.g., Hajj) |
| `serviceBasedEntitlement` | JSON | Service tier config |
| `category` | enum | STANDARD/MEDICAL/PARENTAL/RELIGIOUS |
| `genderRestriction` | enum | MALE/FEMALE/null |
| `accrualBased` | boolean | Accrues monthly |

### Default Leave Types

The system seeds these Qatar-compliant leave types:

1. **Annual Leave** - 21/28 days, paid, carry forward
2. **Sick Leave** - 14 days full pay, medical cert required
3. **Maternity Leave** - 50 days, female only
4. **Paternity Leave** - 3 days, male only
5. **Hajj Leave** - 20 days, unpaid, once per employment
6. **Unpaid Leave** - 30 days max
7. **Compassionate Leave** - 5 days, emergencies

## Security Considerations

- **Role-Based Access**: Only ADMIN/MANAGER can approve
- **Self-Service**: Employees see only their own balances
- **Team View**: Managers see their team's calendar
- **Audit Trail**: All actions logged

## Edge Cases

### Mid-Year Joining

Employee joins July 1st:
- Annual Leave: 10.5 days (6/12 × 21)
- Sick Leave: 7 days (6/12 × 14) after 3 months

### Leave During Probation

- Annual leave accrues but typically not used
- Sick leave unavailable until 3 months service
- Maternity pay requires 1 year service

### Balance Carry Forward

- Max 5 days carry forward by default
- Expires if not used by configurable date
- Admin can manually adjust

## Future Enhancements

- [ ] Public holiday integration
- [ ] Team capacity planning
- [ ] Leave encashment calculation
- [ ] Manager delegation during absence
- [ ] Leave calendar sync (Google/Outlook)
