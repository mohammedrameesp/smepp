# Asset Requests Module - Code Review Guide

Complete list of all asset request-related files for code review and understanding.

---

## 1. API Routes

### Core Request CRUD
| File | Description |
|------|-------------|
| [src/app/api/asset-requests/route.ts](../src/app/api/asset-requests/route.ts) | List & Create requests with filtering, role-based access |
| [src/app/api/asset-requests/[id]/route.ts](../src/app/api/asset-requests/[id]/route.ts) | Get, Update single request |

### Admin Actions
| File | Description |
|------|-------------|
| [src/app/api/asset-requests/[id]/approve/route.ts](../src/app/api/asset-requests/[id]/approve/route.ts) | Approve employee request or return request |
| [src/app/api/asset-requests/[id]/reject/route.ts](../src/app/api/asset-requests/[id]/reject/route.ts) | Reject request with reason |

### User Actions
| File | Description |
|------|-------------|
| [src/app/api/asset-requests/[id]/accept/route.ts](../src/app/api/asset-requests/[id]/accept/route.ts) | Accept asset assignment |
| [src/app/api/asset-requests/[id]/decline/route.ts](../src/app/api/asset-requests/[id]/decline/route.ts) | Decline asset assignment with reason |

### Helper Endpoints
| File | Description |
|------|-------------|
| [src/app/api/asset-requests/my-pending/route.ts](../src/app/api/asset-requests/my-pending/route.ts) | Get current user's pending requests |
| [src/app/api/asset-requests/stats/route.ts](../src/app/api/asset-requests/stats/route.ts) | Get request statistics by status |

---

## 2. Admin Pages (Views)

### Request Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/asset-requests/page.tsx](../src/app/admin/(operations)/asset-requests/page.tsx) | Request list with status summary chips |
| [src/app/admin/(operations)/asset-requests/loading.tsx](../src/app/admin/(operations)/asset-requests/loading.tsx) | Loading skeleton |
| [src/app/admin/(operations)/asset-requests/[id]/page.tsx](../src/app/admin/(operations)/asset-requests/[id]/page.tsx) | Request detail with approve/reject actions |

---

## 3. Employee Pages (Views)

### My Requests
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/asset-requests/page.tsx](../src/app/employee/(operations)/asset-requests/page.tsx) | Employee's own requests list |
| [src/app/employee/(operations)/asset-requests/loading.tsx](../src/app/employee/(operations)/asset-requests/loading.tsx) | Loading skeleton |
| [src/app/employee/(operations)/asset-requests/[id]/page.tsx](../src/app/employee/(operations)/asset-requests/[id]/page.tsx) | Request detail with accept/decline actions |
| [src/app/employee/(operations)/asset-requests/[id]/loading.tsx](../src/app/employee/(operations)/asset-requests/[id]/loading.tsx) | Loading skeleton |

---

## 4. Components

### List & Tables
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/asset-request-list-table.tsx](../src/features/asset-requests/components/asset-request-list-table.tsx) | Sortable table for all requests |

### Status Badges
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/asset-request-status-badge.tsx](../src/features/asset-requests/components/asset-request-status-badge.tsx) | Status badge with color coding |
| [src/features/asset-requests/components/asset-request-type-badge.tsx](../src/features/asset-requests/components/asset-request-type-badge.tsx) | Request type badge |

### Dialogs & Actions
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/asset-request-dialog.tsx](../src/features/asset-requests/components/asset-request-dialog.tsx) | Employee request creation dialog |
| [src/features/asset-requests/components/asset-return-dialog.tsx](../src/features/asset-requests/components/asset-return-dialog.tsx) | Return request creation dialog |
| [src/features/asset-requests/components/asset-assign-dialog.tsx](../src/features/asset-requests/components/asset-assign-dialog.tsx) | Admin assignment dialog |
| [src/features/asset-requests/components/asset-accept-dialog.tsx](../src/features/asset-requests/components/asset-accept-dialog.tsx) | User acceptance dialog |
| [src/features/asset-requests/components/admin-request-actions.tsx](../src/features/asset-requests/components/admin-request-actions.tsx) | Admin action buttons (approve/reject) |

### Alerts
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/pending-assignments-alert.tsx](../src/features/asset-requests/components/pending-assignments-alert.tsx) | Alert for pending user acceptances |

### Exports
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/index.ts](../src/features/asset-requests/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Core Utilities
| File | Description |
|------|-------------|
| [src/features/asset-requests/lib/utils.ts](../src/features/asset-requests/lib/utils.ts) | Request number generation, validation helpers, status utilities |

### Notifications
| File | Description |
|------|-------------|
| [src/features/asset-requests/lib/notifications.ts](../src/features/asset-requests/lib/notifications.ts) | Email and in-app notification handlers by request type |
| [src/features/asset-requests/lib/emails.ts](../src/features/asset-requests/lib/emails.ts) | Email template builders |

### Exports
| File | Description |
|------|-------------|
| [src/features/asset-requests/lib/index.ts](../src/features/asset-requests/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/asset-requests/validations/asset-request.ts](../src/features/asset-requests/validations/asset-request.ts) | All request schemas (create, approve, reject, accept, decline, query) |
| [src/features/asset-requests/validations/index.ts](../src/features/asset-requests/validations/index.ts) | Validation exports |

---

## 7. Constants & Configuration

### Enums (in Prisma schema)
```prisma
enum AssetRequestType {
  EMPLOYEE_REQUEST   // Employee requests an asset
  ADMIN_ASSIGNMENT   // Admin assigns asset to employee
  RETURN_REQUEST     // Employee returns an asset
}

enum AssetRequestStatus {
  PENDING_ADMIN_APPROVAL   // Awaiting admin action
  PENDING_USER_ACCEPTANCE  // Awaiting user accept/decline
  PENDING_RETURN_APPROVAL  // Return awaiting admin approval
  APPROVED                 // Request approved
  REJECTED                 // Request rejected by admin
  ACCEPTED                 // User accepted assignment
  REJECTED_BY_USER         // User declined assignment
  EXPIRED                  // Request expired
  CANCELLED                // Request cancelled
}
```

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "AssetRequest", "AssetRequestHistory") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Request numbers are tenant-scoped unique
- IDOR prevention via tenant-scoped lookups

### 2. AssetRequest Model
```prisma
model AssetRequest {
  id            String             @id @default(cuid())
  tenantId      String
  requestNumber String             // {PREFIX}-AR-YYMMDD-XXX
  type          AssetRequestType
  status        AssetRequestStatus
  assetId       String
  memberId      String             // Target member
  reason        String?
  notes         String?
  assignedById  String?            // For admin assignments
  processedById String?            // Who approved/rejected
  processedAt   DateTime?
  expiresAt     DateTime?          // Optional expiry

  // Relations
  asset              Asset       @relation(...)
  member             TeamMember  @relation("AssetRequestMember")
  assignedByMember   TeamMember? @relation("AssetRequestAssigner")
  processedByMember  TeamMember? @relation("AssetRequestProcessor")
  history            AssetRequestHistory[]

  @@unique([tenantId, requestNumber])
}
```

### 3. Request Number Generation

**Format:** `{ORG_PREFIX}-AR-YYMMDD-XXX`

```typescript
// Examples:
// BCE-AR-250108-001  (first request on Jan 8, 2025 for BCE org)
// JAS-AR-250108-002  (second request same day for JAS org)
```

**Properties:**
- Tenant-scoped sequential numbering
- Date-based prefix for easy sorting
- Generated inside transaction for uniqueness

### 4. Three Request Types & Workflows

#### EMPLOYEE_REQUEST Flow
```
Employee requests asset →
  PENDING_ADMIN_APPROVAL →
    [Admin Approves] → PENDING_USER_ACCEPTANCE →
      [User Accepts] → ACCEPTED (Asset assigned, IN_USE)
      [User Declines] → REJECTED_BY_USER (Asset stays SPARE)
    [Admin Rejects] → REJECTED
```

#### ADMIN_ASSIGNMENT Flow
```
Admin assigns asset →
  PENDING_USER_ACCEPTANCE →
    [User Accepts] → ACCEPTED (Asset assigned, IN_USE)
    [User Declines] → REJECTED_BY_USER (Asset stays SPARE)
```

**Note:** Admin assignments now handled via `/api/assets/[id]/assign` for unified check-in/check-out workflow.

#### RETURN_REQUEST Flow
```
Employee requests return →
  PENDING_RETURN_APPROVAL →
    [Admin Approves] → APPROVED (Asset unassigned, SPARE)
    [Admin Rejects] → REJECTED
```

### 5. Validation Functions

**Pre-Request Validation:**
```typescript
canRequestAsset(assetId, memberId, tenantId)
// Checks: asset exists, status=SPARE, no pending requests

canAssignAsset(assetId, memberId, tenantId)
// Checks: asset exists, status=SPARE, not already assigned to member

canReturnAsset(assetId, memberId, tenantId)
// Checks: asset exists, assigned to member, status=IN_USE, no pending return
```

**Action Validation:**
```typescript
canAdminProcess(status, type)
// Can admin approve/reject this request?

canUserRespond(status, type)
// Can user accept/decline this assignment?
```

### 6. Role-Based Access Control

**Admin View:**
- Sees all requests in organization
- Can approve/reject pending requests
- Can assign assets to users

**Employee View:**
- Sees only their own requests
- Can request available assets
- Can accept/decline assignments
- Can request returns for assigned assets

### 7. Asset Status Integration

**Asset Status Changes:**
| Action | Asset Status |
|--------|-------------|
| User accepts assignment | SPARE → IN_USE |
| Admin approves return | IN_USE → SPARE |
| User declines assignment | SPARE (unchanged) |

**Asset History Created:**
- On acceptance: ASSIGNED action recorded
- On return approval: UNASSIGNED action recorded

### 8. Request History Tracking

**AssetRequestHistory Model:**
```prisma
model AssetRequestHistory {
  id             String       @id @default(cuid())
  assetRequestId String
  action         String       // CREATED, APPROVED, REJECTED, ACCEPTED, DECLINED
  oldStatus      AssetRequestStatus?
  newStatus      AssetRequestStatus?
  notes          String?
  performedById  String
  createdAt      DateTime     @default(now())
}
```

### 9. Notification System

**Email Notifications:**
- Employee request submitted → All admins
- Admin assignment created → Target user
- Return request submitted → All admins
- Request approved → Requester
- Request rejected → Requester
- Assignment accepted → All admins

**In-App Notifications:**
- Same triggers as email
- Uses `NotificationTemplates` from notifications module

**WhatsApp Integration:**
- Approvers notified via WhatsApp for employee requests
- Action tokens invalidated on approval/rejection

### 10. Approval Policy Integration

**Multi-Level Approval:**
- Checks for applicable approval policy based on asset value
- Initializes approval chain if policy exists
- Falls back to notifying all admins if no policy

```typescript
const approvalPolicy = await findApplicablePolicy('ASSET_REQUEST', {
  amount: assetValue,
  tenantId
});
```

### 11. Cross-Module Dependencies

**Asset Requests Uses:**
- **Assets Module** - Asset status management, history
  - `src/features/assets/`
- **Approvals Module** - Multi-level approval policies
  - `src/features/approvals/lib/`
- **Notifications Module** - In-app notifications
  - `src/features/notifications/lib/`
- **WhatsApp Module** - Approver notifications
  - `src/lib/whatsapp/`

**Used By:**
- **Assets Module** - Asset detail shows request history
  - `/admin/assets/[id]` - Shows pending requests

### 12. Activity Logging

All request actions logged:
- `ASSET_REQUEST_CREATED` - Employee request created
- `ASSET_RETURN_REQUESTED` - Return request created
- `ASSET_REQUEST_APPROVED` - Admin approved
- `ASSET_REQUEST_REJECTED` - Admin rejected
- `ASSET_RETURN_APPROVED` - Return approved
- `ASSET_ASSIGNMENT_ACCEPTED` - User accepted
- `ASSET_ASSIGNMENT_DECLINED` - User declined

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (AssetRequest, AssetRequestHistory, enums)
2. **Understand validations**: [src/features/asset-requests/validations/asset-request.ts](../src/features/asset-requests/validations/asset-request.ts)
3. **Core utilities**: [src/features/asset-requests/lib/utils.ts](../src/features/asset-requests/lib/utils.ts)
4. **List/Create API**: [src/app/api/asset-requests/route.ts](../src/app/api/asset-requests/route.ts)
5. **Approval flow**: [src/app/api/asset-requests/[id]/approve/route.ts](../src/app/api/asset-requests/[id]/approve/route.ts)
6. **Acceptance flow**: [src/app/api/asset-requests/[id]/accept/route.ts](../src/app/api/asset-requests/[id]/accept/route.ts)
7. **Notifications**: [src/features/asset-requests/lib/notifications.ts](../src/features/asset-requests/lib/notifications.ts)
8. **UI components**: [src/features/asset-requests/components/](../src/features/asset-requests/components/)
9. **Admin pages**: [src/app/admin/(operations)/asset-requests/](../src/app/admin/(operations)/asset-requests/)
10. **Employee pages**: [src/app/employee/(operations)/asset-requests/](../src/app/employee/(operations)/asset-requests/)
