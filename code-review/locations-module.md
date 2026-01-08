# Locations Module - Code Review Guide

Complete list of all location-related files for code review and understanding.

---

## 1. API Routes

### Core Location CRUD
| File | Description |
|------|-------------|
| [src/app/api/locations/route.ts](../src/app/api/locations/route.ts) | List & Create locations |
| [src/app/api/locations/[id]/route.ts](../src/app/api/locations/[id]/route.ts) | Get, Update, Delete single location |

---

## 2. Admin Pages (Views)

### Location Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/page.tsx](../src/app/admin/(system)/settings/page.tsx) | Settings page with Locations tab |

**Note:** Locations are managed through the main Settings page rather than having dedicated pages. The Locations tab provides full CRUD functionality.

---

## 3. Employee Pages (Views)

_No employee-facing pages for locations. Locations are used internally for asset assignments._

---

## 4. Components

### Settings Components
| File | Description |
|------|-------------|
| [src/features/settings/components/locations-settings.tsx](../src/features/settings/components/locations-settings.tsx) | Location CRUD management component |

---

## 5. Library / Business Logic

_No dedicated business logic files. Locations use simple CRUD operations via API routes._

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/locations/validations/locations.ts](../src/features/locations/validations/locations.ts) | Location schemas (create, update, query) |
| [src/features/locations/validations/index.ts](../src/features/locations/validations/index.ts) | Validation exports |

---

## 7. Constants & Configuration

_No dedicated constants files for locations._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "Location") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Data isolation between organizations
- Session provides `organizationId`

### 2. Location Model
```prisma
model Location {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  tenant      Organization @relation(fields: [tenantId], references: [id])
  assets      Asset[]

  @@unique([tenantId, name])
  @@index([tenantId])
}
```

### 3. Soft Delete Pattern
- Uses `isActive` flag instead of hard deletes
- Inactive locations can be included via query parameter
- Prevents breaking asset assignments

### 4. Unique Name Constraint
- Location names must be unique within an organization
- Prevents duplicate location entries
- Case-sensitive uniqueness at database level

### 5. Cross-Module Dependencies

**Used by:**
- **Assets Module** - Physical location assignment for assets
  - `src/app/api/assets/route.ts` - Asset creation/update with locationId
  - `src/features/assets/components/asset-list-table-server-search.tsx` - Location filtering

**Integration Flow:**
```
Asset Creation → Location Selection → Location Validation → Asset Assignment
```

### 6. Key API Operations

**List Locations** (`GET /api/locations`)
- Returns active locations by default
- Can include inactive with `?includeInactive=true`
- Supports pagination
- Includes asset count per location

**Create Location** (`POST /api/locations`)
- Validates unique name within tenant
- Automatically sets `isActive: true`
- Tenant-scoped creation

**Update Location** (`PUT /api/locations/[id]`)
- Can toggle `isActive` status
- Can rename (validates uniqueness)
- Prevents updates to locations with assigned assets (soft constraint)

**Delete Location** (`DELETE /api/locations/[id]`)
- Soft delete (sets `isActive: false`)
- Prevents deletion if assets are assigned
- Returns 400 error if location has active assets

### 7. Asset Count Tracking
- API returns asset count for each location
- Used for preventing deletion of locations with assets
- Helps identify unused locations for cleanup

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (Location model)
2. **Understand validations**: [src/features/locations/validations/locations.ts](../src/features/locations/validations/locations.ts)
3. **Core API**: [src/app/api/locations/route.ts](../src/app/api/locations/route.ts) and [src/app/api/locations/[id]/route.ts](../src/app/api/locations/[id]/route.ts)
4. **UI component**: [src/features/settings/components/locations-settings.tsx](../src/features/settings/components/locations-settings.tsx)
5. **Integration**: Review how assets use locations in [src/app/api/assets/route.ts](../src/app/api/assets/route.ts)
