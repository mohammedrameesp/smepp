# Public Holidays Feature for Qatar Leave Management

## Overview

Implement public holidays configuration for each organization. Holidays will be excluded from leave day calculations (like weekends) and displayed on the leave calendar.

## Qatar Public Holidays

| Holiday | Duration | Type |
|---------|----------|------|
| Eid al-Fitr | 3 days | Variable (Islamic calendar) |
| Eid al-Adha | 3 days | Variable (Islamic calendar) |
| Qatar National Day | 1 day | Fixed (December 18) |
| Sports Day | 1 day | Variable (2nd Tuesday of February) |

Since Islamic holidays follow the lunar calendar, dates change yearly. Admin must configure each year.

---

## Implementation Steps

### Step 1: Database Schema

**File:** `prisma/schema.prisma`

Add `PublicHoliday` model:
```prisma
model PublicHoliday {
  id          String       @id @default(cuid())
  tenantId    String
  tenant      Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name        String       // "Eid al-Fitr", "Qatar National Day"
  description String?
  startDate   DateTime
  endDate     DateTime     // Same as startDate for single-day holidays
  year        Int          // 2024, 2025, etc.
  isRecurring Boolean      @default(false) // For fixed-date holidays
  color       String       @default("#EF4444")

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([tenantId, name, year])
  @@index([tenantId])
  @@index([tenantId, year])
  @@index([tenantId, startDate, endDate])
}
```

Add relation to Organization model:
```prisma
publicHolidays PublicHoliday[]
```

### Step 2: Leave Utility Functions

**File:** `src/features/leave/lib/leave-utils.ts`

Add functions:
- `isPublicHoliday(date, holidays)` - Returns holiday name if date is a holiday
- `calculateWorkingDaysWithHolidays(start, end, requestType, includeWeekends, weekendDays, holidays)` - Counts working days excluding weekends AND holidays
- `getHolidaysInRange(start, end, holidays)` - Get holidays within a date range

### Step 3: API Endpoints

**New File:** `src/app/api/admin/public-holidays/route.ts`
- `GET` - List holidays (filter by year)
- `POST` - Create holiday (admin only)

**New File:** `src/app/api/admin/public-holidays/[id]/route.ts`
- `GET` - Get single holiday
- `PATCH` - Update holiday
- `DELETE` - Delete holiday

**Update:** `src/app/api/organization/settings/route.ts`
- Include `publicHolidays` in response for current year

### Step 4: Admin Settings UI

**New File:** `src/features/settings/components/public-holidays-settings.tsx`

Features:
- Year selector to view/edit holidays by year
- Table listing holidays with name, dates, actions
- Add/Edit form with date picker (supports date ranges)
- Delete confirmation
- "Add Qatar Holidays" button to seed common holidays for selected year

**Update:** `src/app/admin/(system)/organization/organization-tabs.tsx`
- Add `<PublicHolidaysSettings />` in HR sub-tab after Leave Types

### Step 5: Leave Request Form Updates

**File:** `src/features/leave/components/leave-request-form.tsx`

- Add `publicHolidays` prop
- Update calculation to use `calculateWorkingDaysWithHolidays()`
- Show info text when selected dates include holidays: "Excludes holidays: Eid al-Fitr, Qatar National Day"

**Files to update:**
- `src/app/employee/(hr)/leave/new/page.tsx` - Fetch and pass holidays
- `src/app/admin/(hr)/leave/requests/new/page.tsx` - Fetch and pass holidays

### Step 6: Leave Calendar Updates

**File:** `src/app/admin/(hr)/leave/calendar/client.tsx`

- Fetch holidays for displayed month's year
- Highlight holiday dates with red background (`bg-red-50`)
- Show holiday name on calendar day
- Add legend for holidays

---

## Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add PublicHoliday model |
| `src/features/leave/lib/leave-utils.ts` | Add holiday utility functions |
| `src/app/api/admin/public-holidays/route.ts` | New - CRUD API |
| `src/app/api/admin/public-holidays/[id]/route.ts` | New - Single holiday API |
| `src/app/api/organization/settings/route.ts` | Update - include holidays |
| `src/features/settings/components/public-holidays-settings.tsx` | New - Admin UI |
| `src/features/leave/components/leave-request-form.tsx` | Update - use holidays |
| `src/app/employee/(hr)/leave/new/page.tsx` | Update - fetch holidays |
| `src/app/admin/(hr)/leave/requests/new/page.tsx` | Update - fetch holidays |
| `src/app/admin/(hr)/leave/calendar/client.tsx` | Update - display holidays |
| `src/features/leave/validations/leave.ts` | Add holiday validation schemas |

---

## Verification

1. **Database**: Run `npm run db:generate && npm run db:migrate`
2. **Admin UI**: Go to Organization Settings → HR tab → Public Holidays section
3. **Add Holiday**: Add "Test Holiday" for today's date
4. **Leave Form**: Create new leave request spanning the holiday date - verify day count excludes it
5. **Calendar**: Navigate to the month with the holiday - verify it shows with red background
