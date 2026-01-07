# Email Failure Notifications Plan

**Status**: Planning
**Created**: 2026-01-07
**Priority**: High (Platform Reliability)

---

## Problem Statement

Currently, email delivery failures are handled inconsistently across the platform:

1. **No Super Admin Visibility**: Platform administrators are not notified when emails fail to send
2. **Inconsistent Error Handling**: Only the assets module has proper tenant admin notifications
3. **Silent Failures**: Most email failures are only logged to console, making debugging difficult
4. **No Failure Tracking**: No database records or aggregated reports of email issues

This creates operational blind spots where critical notifications (leave approvals, asset assignments, purchase requests) may fail silently without anyone knowing.

---

## Current State Analysis

### Existing Email Failure Handling

#### ✅ **Assets Module** (Well Implemented)
**File**: `src/app/api/assets/[id]/assign/route.ts`

```typescript
async function notifyAdminsOfEmailFailure(
  tenantId: string,
  context: {
    action: 'assignment' | 'return_request' | 'unassignment' | 'reassignment';
    assetTag: string;
    memberName: string;
    error: string;
  }
): Promise<void> {
  // Creates in-app notifications for all tenant admins
  const admins = await prisma.teamMember.findMany({
    where: { tenantId, role: TeamMemberRole.ADMIN },
    select: { id: true },
  });

  const notifications = admins.map((admin) => ({
    recipientId: admin.id,
    title: 'Email Notification Failed',
    message: `Failed to send ${context.action} email for asset ${context.assetTag} to ${context.memberName}. Error: ${context.error}`,
    type: 'GENERAL' as NotificationType,
  }));

  await createBulkNotifications(notifications, tenantId);
}
```

**Usage:**
- Asset assignments: ✅ Notifies tenant admins
- Asset unassignments: ✅ Notifies tenant admins
- Asset reassignments: ✅ Notifies tenant admins
- ❌ Does NOT notify super admin

#### ❌ **Other Modules** (Basic Console Logging Only)

**Files with inadequate error handling:**
- `src/app/api/asset-requests/[id]/approve/route.ts` - Only `console.error()`
- `src/app/api/asset-requests/[id]/reject/route.ts` - Only `console.error()`
- `src/app/api/asset-requests/[id]/accept/route.ts` - Only `console.error()`
- `src/app/api/asset-requests/[id]/decline/route.ts` - Only `console.error()`
- `src/lib/domains/operations/asset-requests/asset-request-notifications.ts` - Only `console.error()`
- `src/app/api/users/me/change-requests/route.ts` - Only `console.error()`
- `src/app/api/suppliers/[id]/approve/route.ts` - Only `console.error()`
- `src/app/api/purchase-requests/[id]/status/route.ts` - Only `console.error()`

**Example of current handling:**
```typescript
} catch (emailError) {
  console.error('Failed to send email notification:', emailError);
}
```

### Super Admin Email Configuration

**Environment Variable**: `SUPER_ADMIN_EMAIL`

**Current Usage:**
- ✅ New organization signup notifications (`src/app/api/organizations/signup/route.ts`)
- ✅ Super admin authentication check (`src/lib/core/auth.ts`)
- ❌ NOT used for email delivery failures

---

## Proposed Solutions

### **Option 1: Basic Super Admin Notifications** ⭐ RECOMMENDED

**Scope**: Add super admin email alerts to existing failure handler

**Effort**: 1-2 hours

**Changes:**
1. Update `notifyAdminsOfEmailFailure()` to also email super admin
2. Create email template for super admin alerts
3. Keep existing tenant admin in-app notifications

**Pros:**
- Quick to implement
- Minimal changes to existing code
- Immediate visibility for platform team

**Cons:**
- Only covers assets module initially
- Still requires manual rollout to other modules

---

### **Option 2: Centralized Email Failure Service** ⭐⭐ BEST PRACTICE

**Scope**: Create unified email failure handling utility

**Effort**: 3-4 hours

**Architecture:**
```
src/lib/core/
  email-failure-handler.ts    # New centralized service
  email-failure-templates.ts  # Super admin email templates
```

**Changes:**
1. Create centralized `handleEmailFailure()` function
2. Notify both tenant admins (in-app) AND super admin (email)
3. Consistent context structure across all modules
4. Apply to ALL email-sending locations

**Pros:**
- Consistent handling across entire platform
- Easy to maintain and extend
- Better error context and debugging info
- Future-proof architecture

**Cons:**
- More initial work
- Requires changes in multiple files

---

### **Option 3: Full Monitoring System** 🚀 ENTERPRISE READY

**Scope**: Complete email failure tracking and reporting

**Effort**: 6-8 hours

**Features:**
1. Everything in Option 2
2. Database table to store failure records
3. Super admin dashboard page
4. Daily digest emails with aggregated failures
5. Filtering and search capabilities

**Database Schema:**
```prisma
model EmailFailureLog {
  id            String   @id @default(cuid())
  tenantId      String?
  tenant        Organization? @relation(fields: [tenantId], references: [id])

  module        String   // "assets", "leave", "purchase-requests"
  action        String   // "assignment", "approval", "rejection"
  recipientEmail String
  recipientName  String?

  errorMessage  String
  errorCode     String?

  context       Json?    // Additional metadata

  createdAt     DateTime @default(now())
  resolvedAt    DateTime?
  resolvedBy    String?

  @@index([tenantId])
  @@index([createdAt])
}
```

**New Pages:**
- `/super-admin/email-failures` - Dashboard with filters
- `/super-admin/email-failures/[id]` - Failure details

**Pros:**
- Complete observability
- Historical tracking and analytics
- Identify patterns and systemic issues
- Compliance and audit trail

**Cons:**
- Significant development time
- Database schema changes
- Additional storage requirements

---

## Recommended Implementation: Option 2

**Rationale:**
- Balances thoroughness with reasonable effort
- Provides immediate value across entire platform
- Establishes foundation for future enhancements
- Option 3 can be added later if needed

---

## Implementation Plan (Option 2)

### Phase 1: Core Service (1.5 hours)

#### 1.1 Create Email Failure Handler
**File**: `src/lib/core/email-failure-handler.ts`

```typescript
/**
 * Centralized email failure notification service.
 * Notifies tenant admins (in-app) and super admin (email) when emails fail.
 */

import { prisma } from './prisma';
import { sendEmail } from './email';
import { createBulkNotifications } from '@/lib/domains/system/notifications';
import { NotificationType, TeamMemberRole } from '@prisma/client';

export interface EmailFailureContext {
  // Module information
  module: 'assets' | 'asset-requests' | 'leave' | 'purchase-requests' | 'suppliers' | 'hr' | 'auth' | 'other';
  action: string; // e.g., "assignment", "approval", "rejection"

  // Tenant context
  tenantId: string;
  organizationName: string;
  organizationSlug: string;

  // Target user information
  recipientEmail: string;
  recipientName: string;

  // Email details
  emailSubject: string;

  // Error information
  error: string;
  errorCode?: string;

  // Additional context
  metadata?: Record<string, any>;
}

export async function handleEmailFailure(context: EmailFailureContext): Promise<void> {
  // 1. Notify tenant admins via in-app notification
  await notifyTenantAdmins(context);

  // 2. Notify super admin via email
  await notifySuperAdmin(context);
}

async function notifyTenantAdmins(context: EmailFailureContext): Promise<void> {
  try {
    const admins = await prisma.teamMember.findMany({
      where: {
        tenantId: context.tenantId,
        role: TeamMemberRole.ADMIN
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const notifications = admins.map((admin) => ({
      recipientId: admin.id,
      title: 'Email Notification Failed',
      message: `Failed to send ${context.action} email in ${context.module} module to ${context.recipientName}. Error: ${context.error}`,
      type: 'GENERAL' as NotificationType,
    }));

    await createBulkNotifications(notifications, context.tenantId);
  } catch (error) {
    console.error('[handleEmailFailure] Failed to notify tenant admins:', error);
  }
}

async function notifySuperAdmin(context: EmailFailureContext): Promise<void> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    console.warn('[handleEmailFailure] SUPER_ADMIN_EMAIL not configured');
    return;
  }

  try {
    const { emailFailureAlertEmail } = await import('./email-failure-templates');
    const emailData = emailFailureAlertEmail(context);

    await sendEmail({
      to: superAdminEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
  } catch (error) {
    // Don't throw - this is already an error handler
    console.error('[handleEmailFailure] Failed to notify super admin:', error);
  }
}
```

#### 1.2 Create Email Templates
**File**: `src/lib/core/email-failure-templates.ts`

```typescript
/**
 * Email templates for super admin notifications about email delivery failures
 */

import { EmailFailureContext } from './email-failure-handler';

const BRAND_COLOR = '#3b82f6';

function emailWrapper(content: string, orgName: string = 'Durj Platform'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                © 2026 ${orgName}. Platform Alert System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function emailFailureAlertEmail(context: EmailFailureContext): { subject: string; html: string; text: string } {
  const subject = `⚠️ Email Delivery Failure: ${context.organizationName} - ${context.module}`;

  const tenantPortalUrl = `https://${context.organizationSlug}.${process.env.NEXT_PUBLIC_APP_DOMAIN || 'durj.com'}`;
  const superAdminUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN?.includes('localhost') ? 'http' : 'https'}://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'}/super-admin/organizations`;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
            ⚠️ EMAIL DELIVERY FAILURE
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Email Failed to Send</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An email notification failed to send in the platform. This may indicate an issue with the email service or recipient configuration.
    </p>

    <!-- Organization Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR}; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Organization Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Organization:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">
                <a href="${tenantPortalUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">
                  ${context.organizationName}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subdomain:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${context.organizationSlug}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Module:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${context.module}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Action:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${context.action}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Email Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9c3; border-radius: 8px; border-left: 4px solid #eab308; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #854d0e; margin: 0 0 15px 0; font-size: 16px;">Failed Email Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Recipient:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${context.recipientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email Address:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${context.recipientEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subject:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${context.emailSubject}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Error Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; border-radius: 8px; border-left: 4px solid #f43f5e; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #9f1239; margin: 0 0 15px 0; font-size: 16px;">Error Information</h3>
          <p style="margin: 0; color: #333333; font-size: 14px; font-family: monospace; word-break: break-word; background-color: #fef2f2; padding: 12px; border-radius: 4px;">
            ${context.error}
          </p>
          ${context.errorCode ? `
          <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px;">
            Error Code: <code style="background-color: #fef2f2; padding: 2px 6px; border-radius: 3px;">${context.errorCode}</code>
          </p>
          ` : ''}
        </td>
      </tr>
    </table>

    ${context.metadata && Object.keys(context.metadata).length > 0 ? `
    <!-- Additional Context -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #666666; margin: 0 0 15px 0; font-size: 16px;">Additional Context</h3>
          <pre style="margin: 0; color: #333333; font-size: 12px; font-family: monospace; white-space: pre-wrap; word-break: break-word; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">${JSON.stringify(context.metadata, null, 2)}</pre>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Action Required -->
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
        🔧 Recommended Actions:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 14px; line-height: 1.8;">
        <li>Verify recipient email address is valid</li>
        <li>Check Resend API status and quota</li>
        <li>Review email service logs for additional details</li>
        <li>Confirm RESEND_API_KEY is configured correctly</li>
        <li>Check if domain is verified in Resend</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${superAdminUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Organization in Super Admin
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated alert from the Durj Platform monitoring system. The tenant admins have also been notified via in-app notification.
    </p>
  `, 'Durj Platform');

  const text = `
⚠️ EMAIL DELIVERY FAILURE

An email notification failed to send in the platform.

Organization Details:
- Organization: ${context.organizationName}
- Subdomain: ${context.organizationSlug}
- Module: ${context.module}
- Action: ${context.action}

Failed Email Details:
- Recipient: ${context.recipientName}
- Email Address: ${context.recipientEmail}
- Subject: ${context.emailSubject}

Error Information:
${context.error}
${context.errorCode ? `Error Code: ${context.errorCode}` : ''}

${context.metadata ? `\nAdditional Context:\n${JSON.stringify(context.metadata, null, 2)}` : ''}

Recommended Actions:
- Verify recipient email address is valid
- Check Resend API status and quota
- Review email service logs for additional details
- Confirm RESEND_API_KEY is configured correctly
- Check if domain is verified in Resend

View organization: ${superAdminUrl}

---
This is an automated alert from the Durj Platform monitoring system.
The tenant admins have also been notified via in-app notification.
  `.trim();

  return { subject, html, text };
}
```

### Phase 2: Apply to Assets Module (0.5 hours)

#### 2.1 Update Assets Assignment Route
**File**: `src/app/api/assets/[id]/assign/route.ts`

Replace existing `notifyAdminsOfEmailFailure()` function with calls to new centralized handler:

```typescript
// Remove old function (lines 120-153)
// Add import at top:
import { handleEmailFailure } from '@/lib/core/email-failure-handler';

// Replace all calls like this:
await notifyAdminsOfEmailFailure(tenantId, {
  action: 'assignment',
  assetTag: asset.assetTag || asset.model,
  memberName: member.name || member.email,
  error: emailError instanceof Error ? emailError.message : 'Unknown error',
});

// With this:
const org = await prisma.organization.findUnique({
  where: { id: tenantId },
  select: { name: true, slug: true },
});

if (org) {
  await handleEmailFailure({
    module: 'assets',
    action: 'assignment',
    tenantId,
    organizationName: org.name,
    organizationSlug: org.slug,
    recipientEmail: member.email,
    recipientName: member.name || member.email,
    emailSubject: emailContent.subject,
    error: emailError instanceof Error ? emailError.message : 'Unknown error',
    metadata: {
      assetId: asset.id,
      assetTag: asset.assetTag,
      assetModel: asset.model,
    },
  });
}
```

### Phase 3: Apply to All Other Modules (1.5 hours)

#### 3.1 Asset Requests Module
**Files:**
- `src/app/api/asset-requests/[id]/approve/route.ts`
- `src/app/api/asset-requests/[id]/reject/route.ts`
- `src/app/api/asset-requests/[id]/accept/route.ts`
- `src/app/api/asset-requests/[id]/decline/route.ts`

Replace all `console.error()` blocks with `handleEmailFailure()` calls.

#### 3.2 Asset Request Notifications Service
**File**: `src/lib/domains/operations/asset-requests/asset-request-notifications.ts`

Add error handling to all email sending functions.

#### 3.3 Other Modules
- Purchase requests: `src/app/api/purchase-requests/[id]/status/route.ts`
- Suppliers: `src/app/api/suppliers/[id]/approve/route.ts`
- User management: `src/app/api/users/route.ts`, `src/app/api/users/me/change-requests/route.ts`

---

## Testing Strategy

### Unit Tests
**File**: `tests/unit/lib/email-failure-handler.test.ts`

```typescript
describe('handleEmailFailure', () => {
  it('sends in-app notifications to tenant admins', async () => {
    // Mock tenant admins
    // Mock createBulkNotifications
    // Call handleEmailFailure
    // Verify notifications sent
  });

  it('sends email to super admin', async () => {
    // Mock SUPER_ADMIN_EMAIL env var
    // Mock sendEmail
    // Call handleEmailFailure
    // Verify email sent with correct template
  });

  it('handles missing SUPER_ADMIN_EMAIL gracefully', async () => {
    // Unset env var
    // Call handleEmailFailure
    // Verify no error thrown, warning logged
  });

  it('includes all context in super admin email', async () => {
    // Call handleEmailFailure with full context
    // Verify template includes all fields
  });
});
```

### Integration Tests
**File**: `tests/integration/api/email-failures.test.ts`

```typescript
describe('Email Failure Notifications', () => {
  it('notifies admins when asset assignment email fails', async () => {
    // Simulate Resend API failure
    // Make asset assignment API call
    // Verify tenant admin received notification
    // Verify super admin received email
  });

  it('notifies admins when leave approval email fails', async () => {
    // Similar test for leave module
  });
});
```

### Manual Testing Checklist

- [ ] Trigger email failure in assets module → Verify tenant admin gets notification
- [ ] Trigger email failure in assets module → Verify super admin gets email
- [ ] Check super admin email renders correctly in Gmail/Outlook
- [ ] Verify error details are complete and actionable
- [ ] Test with missing SUPER_ADMIN_EMAIL → Should log warning
- [ ] Test with invalid super admin email → Should not crash, should log error
- [ ] Verify metadata JSON displays correctly in email
- [ ] Check links in email work correctly

---

## Environment Variables

Add to `.env.example`:

```bash
# Super Admin Email (for platform-wide alerts)
SUPER_ADMIN_EMAIL=admin@durj.com
```

Ensure production environment has this set.

---

## Rollout Plan

### Stage 1: Core Infrastructure (Week 1)
- ✅ Implement `email-failure-handler.ts`
- ✅ Create email templates
- ✅ Write unit tests
- ✅ Update assets module

### Stage 2: Module Expansion (Week 1-2)
- ✅ Apply to asset-requests module
- ✅ Apply to leave module
- ✅ Apply to purchase-requests module
- ✅ Apply to suppliers module

### Stage 3: Monitoring & Refinement (Week 2)
- ✅ Monitor super admin email volume
- ✅ Gather feedback on email content
- ✅ Adjust notification thresholds if needed
- ✅ Add rate limiting if too noisy

---

## Cost Analysis

### Email Costs (Resend)
- Super admin alert emails: ~1-10 per day (assuming low failure rate)
- Cost: $0.0001 per email
- Monthly cost: **$0.03 - $0.30/month**

### Development Time
- **Option 1**: 1-2 hours = ~$100-200 cost
- **Option 2**: 3-4 hours = ~$300-400 cost
- **Option 3**: 6-8 hours = ~$600-800 cost

### Operational Savings
- **Before**: Email failures go unnoticed, users complain
- **After**: Immediate visibility, proactive resolution
- **Estimated savings**: 5-10 hours/month of debugging time

**ROI**: Payback in first month

---

## Success Metrics

### Short-term (Week 1-2)
- [ ] Zero missed email failures
- [ ] Super admin responds to alerts within 1 hour
- [ ] All modules using centralized handler

### Medium-term (Month 1)
- [ ] Email failure rate < 0.1%
- [ ] Average resolution time < 2 hours
- [ ] No user complaints about missed notifications

### Long-term (Quarter 1)
- [ ] 99.9% email delivery success rate
- [ ] Automated remediation for common errors
- [ ] Historical data informs infrastructure improvements

---

## Future Enhancements (Optional)

### Phase 4: Advanced Features
1. **Slack/Discord Integration** - Send alerts to platform team channel
2. **Auto-retry Logic** - Automatically retry failed emails with exponential backoff
3. **Email Queue System** - Use job queue (BullMQ) for reliable delivery
4. **Delivery Status Webhooks** - Track open/click rates via Resend webhooks
5. **Health Dashboard** - Real-time email delivery health metrics

### Phase 5: Database Tracking (Option 3)
- Implement full monitoring system as described in Option 3
- Build super admin dashboard for historical analysis

---

## Related Files

### New Files (To Create)
- `src/lib/core/email-failure-handler.ts` - Core service
- `src/lib/core/email-failure-templates.ts` - Email templates
- `tests/unit/lib/email-failure-handler.test.ts` - Unit tests

### Files to Update
- `src/app/api/assets/[id]/assign/route.ts` - Replace existing handler
- `src/app/api/asset-requests/[id]/approve/route.ts` - Add error handling
- `src/app/api/asset-requests/[id]/reject/route.ts` - Add error handling
- `src/app/api/asset-requests/[id]/accept/route.ts` - Add error handling
- `src/app/api/asset-requests/[id]/decline/route.ts` - Add error handling
- `src/lib/domains/operations/asset-requests/asset-request-notifications.ts` - Add error handling
- `src/app/api/purchase-requests/[id]/status/route.ts` - Add error handling
- `src/app/api/suppliers/[id]/approve/route.ts` - Add error handling
- `src/app/api/users/route.ts` - Add error handling
- `src/app/api/users/me/change-requests/route.ts` - Add error handling

---

## Questions & Decisions

### Open Questions
1. Should we rate-limit super admin emails to avoid spam during outages?
   - **Recommendation**: Yes, max 10 per hour per organization
2. Should we deduplicate similar failures within a time window?
   - **Recommendation**: Yes, batch identical errors within 5 minutes
3. What should be the escalation policy if super admin doesn't respond?
   - **Recommendation**: Start with email only, add SMS/Slack later

### Decisions Made
- ✅ Use centralized handler (Option 2) for consistency
- ✅ Notify both tenant admins (in-app) AND super admin (email)
- ✅ Include full context in notifications for debugging
- ✅ Non-blocking error handling (don't break user flows)

---

## Document Owner

**Team**: Backend / DevOps
**Last Updated**: 2026-01-07
**Next Review**: After implementation in Week 2

---

## Implementation Checklist

When implementing, use this checklist:

- [ ] Create `email-failure-handler.ts`
- [ ] Create `email-failure-templates.ts`
- [ ] Write unit tests
- [ ] Update assets module (4 locations)
- [ ] Update asset-requests module (4 files)
- [ ] Update asset-request-notifications service
- [ ] Update purchase-requests module
- [ ] Update suppliers module
- [ ] Update users module
- [ ] Add SUPER_ADMIN_EMAIL to .env.example
- [ ] Configure SUPER_ADMIN_EMAIL in production
- [ ] Test email delivery with real failure scenario
- [ ] Verify super admin email renders correctly
- [ ] Document in user guide (super admin section)
- [ ] Add to monitoring/alerting runbook

---

**Status**: Ready for review and approval
**Estimated Total Effort**: 3-4 hours (Option 2)
**Priority**: High - Critical for platform reliability
