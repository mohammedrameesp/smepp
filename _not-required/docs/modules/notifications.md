# Module: Notifications

## Overview

The Notifications module provides in-app notifications for important events across the platform. Notifications are non-blocking and fire-and-forget, ensuring application performance is not impacted.

## Features

- **In-App Notifications**: Bell icon with notification center
- **Real-Time Updates**: New notifications appear instantly
- **Template System**: Pre-defined notification templates
- **Read/Unread Tracking**: Mark notifications as read
- **Bulk Actions**: Mark all as read, clear all
- **Event-Driven**: Triggered by system events

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/system/notifications/notification-service.ts` | Core notification service |
| `src/app/api/notifications/` | Notification API endpoints |
| `src/components/domains/system/notifications/` | Notification UI components |

## Notification Categories

### Leave Requests

| Event | Recipients | Template |
|-------|------------|----------|
| Leave Submitted | Approvers | "New leave request from {employee}" |
| Leave Approved | Requester | "Your leave request has been approved" |
| Leave Rejected | Requester | "Your leave request has been rejected" |
| Leave Cancelled | Approvers | "{employee} cancelled their leave request" |

### Asset Requests

| Event | Recipients | Template |
|-------|------------|----------|
| Request Submitted | Approvers | "New asset request from {employee}" |
| Request Approved | Requester | "Your asset request has been approved" |
| Request Rejected | Requester | "Your asset request has been rejected" |
| Asset Assigned | Assignee | "Asset {assetName} has been assigned to you" |

### Purchase Requests

| Event | Recipients | Template |
|-------|------------|----------|
| Request Submitted | Approvers | "New purchase request: {title}" |
| Request Approved | Requester | "Your purchase request has been approved" |
| Request Rejected | Requester | "Your purchase request has been rejected" |

### Document Expiry

| Event | Recipients | Template |
|-------|------------|----------|
| Expiring Soon | Employee, HR | "{documentType} expires in {days} days" |
| Expired | Employee, HR | "{documentType} has expired" |

### System Events

| Event | Recipients | Template |
|-------|------------|----------|
| Welcome | New User | "Welcome to {orgName}!" |
| Profile Updated | User | "Your profile has been updated" |
| Password Changed | User | "Your password has been changed" |

## API Endpoints

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List user's notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| POST | `/api/notifications/[id]/read` | Mark as read |
| POST | `/api/notifications/mark-all-read` | Mark all as read |
| DELETE | `/api/notifications/[id]` | Delete notification |
| DELETE | `/api/notifications/clear-all` | Clear all |

## Database Schema

### Notification

```prisma
model Notification {
  id          String    @id @default(cuid())
  userId      String
  type        String    // LEAVE_REQUEST, ASSET_ASSIGNED, etc.
  title       String
  message     String
  link        String?   // URL to related item
  data        Json?     // Additional context
  isRead      Boolean   @default(false)
  readAt      DateTime?
  tenantId    String
  createdAt   DateTime  @default(now())
}
```

## Notification Service

### Usage

```typescript
import { notificationService } from '@/lib/domains/system/notifications/notification-service';

// Send notification
await notificationService.notify({
  userId: 'user-123',
  type: 'LEAVE_APPROVED',
  title: 'Leave Approved',
  message: 'Your annual leave request has been approved',
  link: '/employee/leave/requests/req-456',
  data: { requestId: 'req-456', days: 5 },
  tenantId: 'tenant-789'
});

// Send to multiple users
await notificationService.notifyMany([
  { userId: 'user-1', ... },
  { userId: 'user-2', ... }
]);
```

### Template System

```typescript
// Define template
const templates = {
  LEAVE_SUBMITTED: {
    title: 'New Leave Request',
    message: '{employeeName} submitted a leave request for {days} days',
    link: '/admin/leave/requests/{requestId}'
  }
};

// Use template
await notificationService.notifyFromTemplate({
  userId: managerId,
  template: 'LEAVE_SUBMITTED',
  variables: {
    employeeName: 'John Doe',
    days: 5,
    requestId: 'req-123'
  },
  tenantId
});
```

### Non-Blocking Pattern

Notifications are sent fire-and-forget to avoid impacting application performance:

```typescript
// Don't await - fire and forget
void notificationService.notify({ ... });

// Continue with business logic
return NextResponse.json({ success: true });
```

## Configuration

### Notification Preferences (Future)

Per-user preferences:

| Setting | Default | Description |
|---------|---------|-------------|
| leaveRequests | true | Leave request notifications |
| approvals | true | Approval notifications |
| systemAlerts | true | System alerts |
| documentExpiry | true | Document expiry alerts |

### Retention Policy

- Notifications older than 90 days: Auto-deleted
- Read notifications older than 30 days: Auto-deleted
- Maximum per user: 500 notifications

## Security Considerations

- **User Isolation**: Users only see their own notifications
- **Tenant Isolation**: Notifications scoped to organization
- **No Sensitive Data**: Notifications don't contain sensitive information
- **Link Validation**: Links validated before creation

## Integration Points

### Event Triggers

Notifications are triggered from:
- API route handlers
- Background jobs
- Cron tasks

Example in API route:

```typescript
// In leave approval route
export const POST = withErrorHandler(async (request, { prisma, tenant }) => {
  // Approve leave
  const leaveRequest = await prisma.leaveRequest.update({
    where: { id },
    data: { status: 'APPROVED' }
  });

  // Send notification (non-blocking)
  void notificationService.notify({
    userId: leaveRequest.userId,
    type: 'LEAVE_APPROVED',
    title: 'Leave Approved',
    message: 'Your leave request has been approved',
    link: `/employee/leave/requests/${id}`,
    tenantId: tenant.tenantId
  });

  return NextResponse.json({ success: true });
});
```

## Future Enhancements

- [ ] Email notifications
- [ ] Push notifications (web/mobile)
- [ ] User notification preferences
- [ ] Notification grouping
- [ ] Real-time WebSocket updates
- [ ] Slack/Teams integration
