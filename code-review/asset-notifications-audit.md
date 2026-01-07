# Asset Module Notifications Audit

**Status**: Current State Analysis
**Last Updated**: 2026-01-07
**Purpose**: Document existing notifications and identify gaps

---

## Current Notifications (Implemented)

### 1. Asset Requests

#### ✅ **Employee Request Submitted**
- **Trigger**: Employee submits asset request
- **Recipients**: Admins (or approvers if policy exists)
- **Channels**:
  - 📧 Email: `assetRequestSubmittedEmail()`
  - 🔔 In-app: `NotificationTemplates.assetRequestSubmitted()`
  - 📱 WhatsApp: `notifyApproversViaWhatsApp()` (if configured)
- **File**: `src/lib/domains/operations/asset-requests/asset-request-notifications.ts:120`

#### ✅ **Admin Assignment Created**
- **Trigger**: Admin assigns asset to employee
- **Recipients**: Target employee
- **Channels**:
  - 📧 Email: `assetAssignmentPendingEmail()`
  - 🔔 In-app: `NotificationTemplates.assetAssignmentPending()`
- **File**: `src/lib/domains/operations/asset-requests/asset-request-notifications.ts:238`

#### ✅ **Return Request Submitted**
- **Trigger**: Employee requests to return asset
- **Recipients**: Admins
- **Channels**:
  - 📧 Email: `assetReturnRequestEmail()`
  - 🔔 In-app: `NotificationTemplates.assetReturnSubmitted()`
- **File**: `src/lib/domains/operations/asset-requests/asset-request-notifications.ts:282`

---

### 2. Asset Request Actions

#### ✅ **Request Approved**
- **Trigger**: Admin approves employee request
- **Recipients**: Employee who requested
- **Channels**:
  - 🔔 In-app: Notification sent
  - ❌ Email: **NOT IMPLEMENTED** (Gap #1)
- **File**: `src/app/api/asset-requests/[id]/approve/route.ts`

#### ✅ **Request Rejected**
- **Trigger**: Admin rejects employee request
- **Recipients**: Employee who requested
- **Channels**:
  - 📧 Email: `assetRequestRejectedEmail()`
  - 🔔 In-app: Notification sent
- **File**: `src/app/api/asset-requests/[id]/reject/route.ts`

#### ✅ **Assignment Accepted**
- **Trigger**: Employee accepts asset assignment
- **Recipients**: Admin who assigned
- **Channels**:
  - 📧 Email: `assetAssignmentAcceptedEmail()`
  - 🔔 In-app: Notification sent
- **File**: `src/app/api/asset-requests/[id]/accept/route.ts`

#### ✅ **Assignment Declined**
- **Trigger**: Employee declines asset assignment
- **Recipients**: Admin who assigned
- **Channels**:
  - 📧 Email: `assetAssignmentDeclinedEmail()`
  - 🔔 In-app: Notification sent
- **File**: `src/app/api/asset-requests/[id]/decline/route.ts`

#### ✅ **Return Approved**
- **Trigger**: Admin approves return request
- **Recipients**: Employee who requested return
- **Channels**:
  - 📧 Email: `assetReturnApprovedEmail()`
  - 🔔 In-app: Notification sent
- **File**: `src/app/api/asset-requests/[id]/approve/route.ts` (return flow)

#### ✅ **Return Rejected**
- **Trigger**: Admin rejects return request
- **Recipients**: Employee who requested return
- **Channels**:
  - 📧 Email: `assetReturnRejectedEmail()`
  - 🔔 In-app: Notification sent
- **File**: `src/app/api/asset-requests/[id]/reject/route.ts` (return flow)

---

## Missing Notifications (Gaps)

### 🔴 **Gap #1: Request Approved Email**
- **Current**: Only in-app notification
- **Missing**: Email notification
- **Impact**: Medium - Users may miss approval if not checking app
- **Recommendation**: Add email template similar to `assetRequestRejectedEmail()`

**Template Needed**:
```typescript
export function assetRequestApprovedEmail(data: {
  requestNumber: string;
  assetTag: string | null;
  assetModel: string;
  assetBrand: string | null;
  assetType: string;
  userName: string;
  approverName: string;
  orgSlug: string;
  orgName: string;
}): { subject: string; html: string; text: string }
```

---

### 🟡 **Gap #2: Direct Asset Assignment (No Request)**
- **Scenario**: Admin assigns asset directly to user (bypasses request flow)
- **Current**: No notification
- **Missing**: Notify employee when asset is directly assigned
- **Impact**: High - Employee unaware of new asset responsibility
- **File**: `src/app/api/assets/[id]/assign/route.ts`

**Action Required**:
- Add notification when asset `assignedMemberId` changes
- Send email + in-app notification to new assignee
- Notify previous assignee if asset was reassigned

---

### 🟡 **Gap #3: Asset Unassignment**
- **Scenario**: Admin removes asset from employee (sets `assignedMemberId` to null)
- **Current**: No notification
- **Missing**: Notify employee when asset is removed from them
- **Impact**: Medium - Employee should know they're no longer responsible
- **File**: `src/app/api/assets/[id]/route.ts` (UPDATE)

**Action Required**:
- Notify employee when asset is unassigned from them
- Email + in-app: "Asset [X] has been unassigned from you"

---

### 🟡 **Gap #4: Asset Updated (Major Changes)**
- **Scenario**: Admin updates asset details (e.g., changes status to MAINTENANCE)
- **Current**: No notification
- **Missing**: Notify assignee of significant changes
- **Impact**: Low-Medium - Depends on change type
- **File**: `src/app/api/assets/[id]/route.ts` (UPDATE)

**Significant Changes That Should Notify**:
- Status changed to `MAINTENANCE` → Notify assignee
- Status changed to `DISPOSED` → Notify assignee
- Warranty expiry updated → Notify admin if near expiry
- Asset moved to different location → Notify assignee

**Action Required**:
- Detect significant field changes in update route
- Send targeted notifications based on change type

---

### 🟡 **Gap #5: Asset Maintenance Scheduled**
- **Scenario**: Admin schedules maintenance for an asset
- **Current**: No notification
- **Missing**: Notify assignee of upcoming maintenance
- **Impact**: Medium - User needs to return asset for maintenance
- **File**: `src/app/api/assets/[id]/maintenance/route.ts`

**Action Required**:
- Notify assignee when maintenance is scheduled
- Include maintenance date and instructions
- Reminder notification X days before maintenance

---

### 🟢 **Gap #6: Asset Maintenance Completed**
- **Scenario**: Maintenance record is closed/completed
- **Current**: No notification
- **Missing**: Notify assignee asset is ready for pickup
- **Impact**: Low - Nice to have
- **File**: `src/app/api/assets/[id]/maintenance/route.ts`

**Action Required**:
- Notify previous assignee when asset comes back from maintenance
- Optional: Auto-reassign asset and notify

---

### 🟢 **Gap #7: Asset Warranty Expiring**
- **Scenario**: Asset warranty expires within 30 days
- **Current**: Alert shown on asset detail page
- **Missing**: Proactive notification to admin
- **Impact**: Medium - Admins should know in advance
- **File**: Currently handled by cron job (planned but not implemented)

**Action Required**:
- Create cron job: `/api/cron/asset-warranty-expiry`
- Run daily, check assets with `warrantyExpiry` < 30 days from now
- Notify admins with list of expiring warranties
- Batch notification (daily digest)

---

### 🟢 **Gap #8: Asset Disposed**
- **Scenario**: Admin disposes of an asset
- **Current**: No notification
- **Missing**: Notify previous assignee (if any) that asset is disposed
- **Impact**: Low - Informational
- **File**: `src/app/api/assets/[id]/dispose/route.ts`

**Action Required**:
- Notify last assignee that asset [X] has been disposed
- Notify admin team for audit trail

---

### 🟢 **Gap #9: Asset Created**
- **Scenario**: New asset is added to inventory
- **Current**: No notification
- **Missing**: Optional notification to admins about new asset
- **Impact**: Very Low - Nice to have for large teams
- **File**: `src/app/api/assets/route.ts` (POST)

**Action Required**:
- Optional: Notify admin team when new asset > $X value is added
- Could be disabled by default (too noisy)

---

### 🔵 **Gap #10: Bulk Asset Import**
- **Scenario**: Admin imports multiple assets via CSV
- **Current**: No notification
- **Missing**: Summary notification after import completes
- **Impact**: Low - Confirmation of successful import
- **File**: `src/app/api/assets/import/route.ts`

**Action Required**:
- Send email to user who initiated import
- Include summary: X assets created, Y errors
- Attach error report if any failures

---

## Summary Matrix

| Action | In-App | Email | WhatsApp | Priority |
|--------|--------|-------|----------|----------|
| **Asset Requests** |
| Employee Request Submitted | ✅ | ✅ | ✅ | - |
| Admin Assignment Created | ✅ | ✅ | ❌ | - |
| Return Request Submitted | ✅ | ✅ | ❌ | - |
| **Request Actions** |
| Request Approved | ✅ | ❌ | ❌ | 🔴 High |
| Request Rejected | ✅ | ✅ | ❌ | - |
| Assignment Accepted | ✅ | ✅ | ❌ | - |
| Assignment Declined | ✅ | ✅ | ❌ | - |
| Return Approved | ✅ | ✅ | ❌ | - |
| Return Rejected | ✅ | ✅ | ❌ | - |
| **Direct Asset Operations** |
| Asset Directly Assigned | ❌ | ❌ | ❌ | 🟡 Medium |
| Asset Unassigned | ❌ | ❌ | ❌ | 🟡 Medium |
| Asset Status Changed (Major) | ❌ | ❌ | ❌ | 🟡 Medium |
| Maintenance Scheduled | ❌ | ❌ | ❌ | 🟡 Medium |
| Maintenance Completed | ❌ | ❌ | ❌ | 🟢 Low |
| Warranty Expiring Soon | ❌ | ❌ | ❌ | 🟢 Low |
| Asset Disposed | ❌ | ❌ | ❌ | 🟢 Low |
| Asset Created (High Value) | ❌ | ❌ | ❌ | 🟢 Very Low |
| Bulk Import Complete | ❌ | ❌ | ❌ | 🔵 Nice to Have |

**Legend**:
- ✅ Implemented
- ❌ Not Implemented
- 🔴 High Priority (Core user flow)
- 🟡 Medium Priority (Important but not critical)
- 🟢 Low Priority (Helpful but optional)
- 🔵 Nice to Have (Future enhancement)

---

## Notification Channels Comparison

### 📧 **Email**
**Pros**:
- Reaches users outside app
- Formal audit trail
- Can include detailed info
- Works for external stakeholders

**Cons**:
- Can be noisy
- May end up in spam
- Delayed delivery possible

**Best For**:
- Critical actions (approvals, rejections)
- Requests requiring action
- Legal/compliance notifications

### 🔔 **In-App Notifications**
**Pros**:
- Instant delivery
- Low noise
- Contextual (links to relevant pages)
- Easy to mark as read

**Cons**:
- Only works if user is logged in
- Can be missed if user doesn't check
- No persistent record outside app

**Best For**:
- Real-time updates
- Low-priority info
- Status changes
- Internal communications

### 📱 **WhatsApp**
**Pros**:
- Very high open rate
- Instant delivery
- Can include action buttons
- Popular in MENA region

**Cons**:
- Requires phone number
- Privacy concerns
- Setup complexity
- Cost per message

**Best For**:
- Urgent approvals
- High-priority requests
- Field workers without email access
- Optional enhancement

---

## Recommendations

### Phase 1: Critical Gaps (Do First)

1. ✅ **Add Request Approved Email** (Gap #1)
   - Effort: 1 hour
   - Impact: High
   - Completes request lifecycle

2. ✅ **Direct Asset Assignment Notifications** (Gap #2)
   - Effort: 2-3 hours
   - Impact: High
   - Critical user communication

3. ✅ **Asset Unassignment Notifications** (Gap #3)
   - Effort: 1 hour
   - Impact: Medium
   - Completes assignment lifecycle

### Phase 2: Important Enhancements (Do Next)

4. ✅ **Asset Status Change Notifications** (Gap #4)
   - Effort: 3-4 hours
   - Impact: Medium
   - Conditional notifications based on change type

5. ✅ **Maintenance Scheduled Notifications** (Gap #5)
   - Effort: 2 hours
   - Impact: Medium
   - Operational efficiency

### Phase 3: Proactive Features (Future)

6. ✅ **Warranty Expiry Cron** (Gap #7)
   - Effort: 4-5 hours
   - Impact: Medium
   - Requires cron job setup

7. ✅ **Maintenance Completed** (Gap #6)
   - Effort: 1 hour
   - Impact: Low
   - Nice to have

8. ✅ **Asset Disposed** (Gap #8)
   - Effort: 1 hour
   - Impact: Low
   - Audit trail

### Phase 4: Optional (Low Priority)

9. ⏸️ **Asset Created Notification** (Gap #9)
   - Only for high-value assets
   - Configurable threshold

10. ⏸️ **Bulk Import Summary** (Gap #10)
   - Email report after import
   - Error log attachment

---

## Implementation Checklist

### For Each New Notification:

- [ ] Create email template in `src/lib/core/asset-request-emails.ts`
- [ ] Add in-app notification template in `src/lib/domains/system/notifications/notification-service.ts`
- [ ] Update API route to call notification functions
- [ ] Add notification trigger in appropriate handler
- [ ] Test with development email (catch-all)
- [ ] Add to notification preferences (allow users to opt-out)
- [ ] Document in user guide
- [ ] Add E2E test for notification delivery

---

## Configuration & User Preferences

### Future Enhancement: Notification Settings

Allow users to configure which notifications they receive:

**Location**: `/admin/(system)/settings/notifications`

**Options**:
```typescript
interface NotificationPreferences {
  assetRequests: {
    submitted: { email: boolean; inApp: boolean; whatsapp: boolean };
    approved: { email: boolean; inApp: boolean };
    rejected: { email: boolean; inApp: boolean };
  };
  assetAssignments: {
    assigned: { email: boolean; inApp: boolean };
    unassigned: { email: boolean; inApp: boolean };
  };
  assetMaintenance: {
    scheduled: { email: boolean; inApp: boolean };
    completed: { email: boolean; inApp: boolean };
  };
  assetAlerts: {
    warrantyExpiring: { email: boolean; inApp: boolean };
    disposed: { email: boolean; inApp: boolean };
  };
}
```

**Default**: All critical notifications ON, optional notifications OFF

---

## Cost Analysis

### Email Costs (via SendGrid/AWS SES)
- Average: $0.0001 per email
- 1000 users × 10 notifications/month = 10,000 emails
- Cost: **$1/month** per 1000 active users

### WhatsApp Costs (via Meta Business API)
- Average: $0.01 - $0.05 per message (varies by country)
- 100 users × 5 urgent notifications/month = 500 messages
- Cost: **$5-25/month** per 100 active users
- **Recommendation**: Optional, user opt-in only

---

## Testing Strategy

### Unit Tests
```typescript
// Test email template generation
describe('assetRequestApprovedEmail', () => {
  it('generates correct subject and body', () => {
    const result = assetRequestApprovedEmail({ ... });
    expect(result.subject).toContain('Approved');
    expect(result.html).toContain('Request Number');
  });
});
```

### Integration Tests
```typescript
// Test notification delivery
describe('POST /api/asset-requests/:id/approve', () => {
  it('sends email and in-app notification', async () => {
    // Mock sendEmail and createNotification
    // Call approve endpoint
    // Verify both functions called with correct params
  });
});
```

### E2E Tests
```typescript
// Test user receives notification
test('user receives approval notification', async ({ page }) => {
  // Admin approves request
  // Switch to employee account
  // Check notification bell
  // Verify notification appears
  // Check email inbox (test email account)
});
```

---

## Related Files

- `src/lib/domains/operations/asset-requests/asset-request-notifications.ts` - Main notification logic
- `src/lib/core/asset-request-emails.ts` - Email templates
- `src/lib/email-templates.ts` - Legacy email templates (to be migrated)
- `src/lib/domains/system/notifications/notification-service.ts` - In-app notifications
- `src/lib/whatsapp/` - WhatsApp integration
- `src/app/api/asset-requests/` - Asset request API routes
- `src/app/api/assets/` - Asset CRUD API routes

---

## Next Steps

1. **Review this audit** with product team
2. **Prioritize gaps** based on user feedback
3. **Create implementation tickets** for Phase 1
4. **Design notification preferences UI** for Phase 4
5. **Monitor notification metrics** after deployment:
   - Open rate
   - Click-through rate
   - Opt-out rate
   - User complaints

---

**Document Owner**: Backend Team
**Last Review**: 2026-01-07
**Next Review**: Q2 2026 (after Phase 1 implementation)
