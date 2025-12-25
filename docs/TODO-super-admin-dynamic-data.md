# Super Admin Dashboard - Dynamic Data Implementation

## Current Status
Most dashboard data is **hardcoded mockup data**. Only 3 values are dynamic from the database.

## Already Dynamic
- [x] Organizations count (hero stat)
- [x] Total Users count (hero stat)
- [x] Organizations table (full list with name, slug, tier, members, created date)

---

## To Implement - Hero Stats

| Item | Current | Implementation Needed |
|------|---------|----------------------|
| Organizations trend | "+3 this week" | Query orgs created in last 7 days |
| Users trend | "+18 this week" | Query users created in last 7 days |
| Active Now | `23` | Track active sessions (requires session tracking) |
| System Status | "OK" | Health check endpoint / external monitoring |
| Uptime | "99.99%" | External uptime monitoring integration |

---

## To Implement - Overview Tab

### Recent Activity Feed
Need to create an `ActivityLog` or `AuditLog` table to track:
- User joins (OrganizationUser created)
- Plan upgrades (Organization subscriptionTier changed)
- New organizations (Organization created)
- Payments (Stripe webhook events)

### Quick Stats
| Item | Implementation |
|------|----------------|
| Emails Today | Track emails sent via email service (Resend/SendGrid) |
| 2FA Adoption | `COUNT(users WHERE twoFactorEnabled = true) / COUNT(users)` |
| DAU | Track unique logins per day (requires login tracking) |

### Alerts
- Payment failures: Stripe webhook `invoice.payment_failed`
- Trials expiring: Query orgs with trial end date approaching

---

## To Implement - Communication Tab

Requires integration with communication services:
- **Emails**: Resend/SendGrid API stats
- **WhatsApp**: WhatsApp Business API (if integrated)
- **SMS**: Twilio/similar API stats
- **Push**: Firebase/OneSignal stats
- **Delivery rates**: From respective service APIs

---

## To Implement - Security Tab

| Item | Implementation |
|------|----------------|
| Failed Logins | Log failed auth attempts in DB |
| 2FA Adoption | Query `User.twoFactorEnabled` |
| Active Alerts | Create alerts system |
| Password Resets | Track password reset requests |
| Security Events | Create `SecurityEvent` table |

---

## To Implement - Engagement Tab

| Item | Implementation |
|------|----------------|
| DAU/WAU/MAU | Track user logins with timestamps |
| Feature Adoption | Track which modules orgs have enabled/used |
| User Segments | Categorize by last login date |
| Desktop vs Mobile | Track user agent on login |

---

## To Implement - System Health Tab

| Item | Implementation |
|------|----------------|
| API latency | Middleware to track response times |
| Database connections | Prisma metrics / DB pool stats |
| Jobs queued | If using job queue (Bull, etc.) |
| Error rate | Error tracking (Sentry integration) |
| Uptime | External monitoring (UptimeRobot, etc.) |
| Response time chart | Store historical latency data |

---

## Priority Order (Suggested)

### Phase 1 - Quick Wins (Database queries only)
1. Organizations/Users weekly trends
2. 2FA Adoption rate
3. Pending invitations count (already have data)

### Phase 2 - Activity Tracking
1. Create `ActivityLog` model
2. Log key events (user joins, org created, plan changes)
3. Display real activity feed

### Phase 3 - Security Features
1. Create `SecurityEvent` model
2. Track failed logins
3. Track password resets

### Phase 4 - Engagement Metrics
1. Track user logins (last login timestamp)
2. Calculate DAU/WAU/MAU
3. Track feature/module usage

### Phase 5 - External Integrations
1. Email service stats
2. Error tracking (Sentry)
3. Uptime monitoring

---

## Database Models Needed

```prisma
model ActivityLog {
  id             String   @id @default(cuid())
  type           String   // USER_JOINED, ORG_CREATED, PLAN_UPGRADED, PAYMENT_RECEIVED
  actorId        String?
  organizationId String?
  metadata       Json?
  createdAt      DateTime @default(now())
}

model SecurityEvent {
  id             String   @id @default(cuid())
  type           String   // FAILED_LOGIN, 2FA_ENABLED, PASSWORD_RESET
  userId         String?
  organizationId String?
  ipAddress      String?
  userAgent      String?
  metadata       Json?
  createdAt      DateTime @default(now())
}

model UserSession {
  id        String   @id @default(cuid())
  userId    String
  device    String?  // desktop, mobile, tablet
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  expiresAt DateTime
}
```

---

*Created: December 2024*
*Last Updated: December 2024*
