# Notifications Module - Code Review Guide

Complete list of all notification-related files for code review and understanding.

---

## 1. API Routes

### Core Notification Operations
| File | Description |
|------|-------------|
| [src/app/api/notifications/route.ts](../src/app/api/notifications/route.ts) | List notifications with pagination, Mark all as read |
| [src/app/api/notifications/[id]/read/route.ts](../src/app/api/notifications/[id]/read/route.ts) | Mark single notification as read |
| [src/app/api/notifications/unread-count/route.ts](../src/app/api/notifications/unread-count/route.ts) | Get unread notification count for bell badge |

---

## 2. Admin Pages (Views)

_No dedicated admin pages for notifications. Notifications are displayed globally via the notification bell in the header/navbar component._

---

## 3. Employee Pages (Views)

_No dedicated employee pages for notifications. All users see the same notification bell and dropdown interface._

---

## 4. Components

### Notification UI Components
| File | Description |
|------|-------------|
| [src/features/notifications/components/notification-bell.tsx](../src/features/notifications/components/notification-bell.tsx) | Bell icon with unread count badge |
| [src/features/notifications/components/notification-dropdown.tsx](../src/features/notifications/components/notification-dropdown.tsx) | Dropdown popup displaying notification list |
| [src/features/notifications/components/notification-item.tsx](../src/features/notifications/components/notification-item.tsx) | Single notification display component |
| [src/features/notifications/components/notification-provider.tsx](../src/features/notifications/components/notification-provider.tsx) | React context provider for notifications |
| [src/features/notifications/components/index.ts](../src/features/notifications/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Notification Service
| File | Description |
|------|-------------|
| [src/features/notifications/lib/notification-service.ts](../src/features/notifications/lib/notification-service.ts) | Core notification service with pre-built templates |
| [src/features/notifications/lib/index.ts](../src/features/notifications/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/notifications/validations/notifications.ts](../src/features/notifications/validations/notifications.ts) | Query validation (isRead filter, pagination) |

---

## 7. Constants & Configuration

_No dedicated constants files. Notification types are defined as enums in the Prisma schema._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "Notification") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Users only see notifications for their current organization
- Session provides `organizationId` and `userId`

### 2. Notification Model
```prisma
model Notification {
  id         String           @id @default(cuid())
  tenantId   String
  userId     String
  type       NotificationType
  title      String
  message    String
  actionUrl  String?
  isRead     Boolean          @default(false)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  tenant Organization @relation(fields: [tenantId], references: [id])
  user   User         @relation(fields: [userId], references: [id])

  @@index([tenantId, userId, isRead])
  @@index([userId, createdAt])
}

enum NotificationType {
  LEAVE_REQUEST_SUBMITTED
  LEAVE_REQUEST_APPROVED
  LEAVE_REQUEST_REJECTED
  LEAVE_REQUEST_CANCELLED
  ASSET_ASSIGNED
  ASSET_RETURNED
  PURCHASE_REQUEST_CREATED
  PURCHASE_REQUEST_APPROVED
  PURCHASE_REQUEST_REJECTED
  DOCUMENT_EXPIRY_ALERT
  SUBSCRIPTION_RENEWAL_ALERT
  GENERAL
}
```

### 3. Notification Service Templates

The notification service provides pre-built templates for common events:

**Leave Request Templates:**
- `leaveRequestSubmitted()` - Notify approvers when request is submitted
- `leaveRequestApproved()` - Notify employee when leave is approved
- `leaveRequestRejected()` - Notify employee when leave is rejected
- `leaveRequestCancelled()` - Notify employee when leave is cancelled

**Asset Templates:**
- `assetAssigned()` - Notify user when asset is assigned to them
- `assetReturned()` - Notify admin when asset is returned

**Purchase Request Templates:**
- `purchaseRequestCreated()` - Notify approvers when purchase request is created
- `purchaseRequestApproved()` - Notify requester when approved
- `purchaseRequestRejected()` - Notify requester when rejected

**Expiry Alert Templates:**
- `documentExpiryAlert()` - Notify relevant users of expiring documents
- `subscriptionRenewalAlert()` - Notify admins of upcoming subscription renewals

### 4. Non-Blocking Design

Notifications are **fire and forget**:
```typescript
// Failures don't break the main operation
try {
  await createNotification(userId, type, title, message);
} catch (error) {
  console.error('Notification failed:', error);
  // Main operation continues
}
```

This ensures notification failures never block critical business operations.

### 5. Bulk Notification Support

The service supports creating notifications for multiple users:
```typescript
// Notify all approvers in a workflow
await Promise.all(
  approvers.map(approver =>
    createNotification(approver.userId, type, title, message)
  )
);
```

### 6. Real-Time UI Updates

**Notification Bell Component:**
- Displays unread count badge
- Polls `/api/notifications/unread-count` for updates
- Badge color changes based on count

**Notification Dropdown:**
- Shows recent notifications (paginated)
- "Mark all as read" button
- Read/unread visual distinction
- Click notification to navigate to `actionUrl`

### 7. Cross-Module Dependencies

**Used by (Notification Consumers):**
- **Leave Module** - Leave request workflow notifications
  - `src/app/api/leave/requests/route.ts`
  - `src/app/api/leave/requests/[id]/approve/route.ts`
  - `src/app/api/leave/requests/[id]/reject/route.ts`
- **Asset Requests Module** - Asset assignment notifications
  - `src/features/asset-requests/lib/notifications.ts`
- **Purchase Requests Module** - Purchase approval notifications
  - `src/features/purchase-requests/lib/purchase-request-creation.ts`
- **Company Documents Module** - Document expiry alerts
  - Cron job: `src/app/api/cron/company-docs-expiry/route.ts`
- **Employees Module** - Employee document expiry alerts
  - Cron job: `src/app/api/cron/employee-docs-expiry/route.ts`

**Integration Flow:**
```
Business Event (e.g., Leave Approved)
    ↓
Notification Service Called
    ↓
Notification Created in DB
    ↓
User sees unread count increase
    ↓
User opens dropdown
    ↓
Notification displayed with actionUrl
    ↓
User clicks → navigates to related page
    ↓
Notification marked as read
```

### 8. Pagination Support

**List Notifications API** supports:
- `page` - Current page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `isRead` - Filter by read status (optional)

Returns:
```typescript
{
  data: Notification[],
  pagination: {
    page: number,
    pageSize: number,
    total: number,
    totalPages: number,
    hasMore: boolean
  }
}
```

### 9. Action URLs

Notifications can include an `actionUrl` to navigate users to the related entity:

Examples:
- Leave request: `/admin/leave/requests/[id]`
- Asset assignment: `/employee/my-assets`
- Purchase request: `/admin/purchase-requests/[id]`
- Document expiry: `/admin/company-documents/[id]`

### 10. Read/Unread Tracking

**Mark as Read:**
- Single: `PUT /api/notifications/[id]/read`
- All: `POST /api/notifications` (marks all for current user)

**Unread Count:**
- Efficient query: `WHERE userId = ? AND isRead = false`
- Used for bell badge display
- Cached in frontend state

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (Notification model and NotificationType enum)
2. **Core service**: [src/features/notifications/lib/notification-service.ts](../src/features/notifications/lib/notification-service.ts)
3. **Understand validations**: [src/features/notifications/validations/notifications.ts](../src/features/notifications/validations/notifications.ts)
4. **API routes**: [src/app/api/notifications/route.ts](../src/app/api/notifications/route.ts)
5. **UI components**:
   - [src/features/notifications/components/notification-bell.tsx](../src/features/notifications/components/notification-bell.tsx)
   - [src/features/notifications/components/notification-dropdown.tsx](../src/features/notifications/components/notification-dropdown.tsx)
6. **Integration**: Review how leave, assets, and purchase requests use the notification service
