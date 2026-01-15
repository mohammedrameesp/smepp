# Future Enhancements

This document tracks planned improvements and technical debt items for future development.

---

## WhatsApp Notifications

### Role-Based Approver Routing

**Current State:**
The `findApproversForRole()` function in `src/lib/whatsapp/approval-integration.ts` ignores the `requiredRole` parameter and simply returns all admins (`isAdmin: true`).

```typescript
// Current implementation - role is ignored
async function findApproversForRole(tenantId: string, requiredRole: Role) {
  return prisma.teamMember.findMany({
    where: { tenantId, isAdmin: true, isDeleted: false }
  });
}
```

**Limitation:**
All admins receive WhatsApp notifications regardless of the approval step's required role. This works for simple org structures but doesn't support multi-level approval workflows where different roles approve at different stages.

**Future Enhancement:**
Implement proper role-based routing:

1. Map `Role` enum to actual permission flags or team member roles
2. Consider manager relationships (direct reports)
3. Support scenarios like:
   - `MANAGER` role → Find the requester's direct manager
   - `HR_MANAGER` → Find users with `hasHRAccess: true`
   - `FINANCE_MANAGER` → Find users with `hasFinanceAccess: true`
   - `DIRECTOR` → Find users with `isOwner: true` or senior leadership

**Files to Modify:**
- `src/lib/whatsapp/approval-integration.ts` - `findApproversForRole()`
- Potentially add role mapping configuration

---

## Approval Workflow

### Multi-Level Approval Chain

**Current State:**
Approval policies can define multiple levels, but WhatsApp notifications only go to the first level's approvers.

**Future Enhancement:**
Send WhatsApp notifications when approval moves to the next level (after previous level approves).

---

## Phone Number Verification

### OTP-Based Verification

**Current State:**
Phone numbers from HR profile are used directly without verification. Manual admin verification via `WhatsAppUserPhone.isVerified` flag.

**Future Enhancement:**
Implement OTP-based phone verification:
1. User enters phone number
2. Send OTP via WhatsApp
3. User confirms OTP
4. Mark number as verified

---

*Last Updated: January 2025*
