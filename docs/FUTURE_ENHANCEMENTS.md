# Future Enhancements

This document tracks planned improvements and technical debt items for future development.

---

## WhatsApp Notifications

### Role-Based Approver Routing

**Status:** COMPLETED (January 2026)

**Implementation:**
The `findApproversForRole()` function in `src/lib/whatsapp/approval-integration.ts` now properly routes WhatsApp notifications based on the required role:

- `MANAGER` → Requester's direct manager (via `reportingToId`)
- `HR_MANAGER` → Team members with `hasHRAccess: true`
- `FINANCE_MANAGER` → Team members with `hasFinanceAccess: true`
- `OPERATIONS_MANAGER` → Team members with `hasOperationsAccess: true`
- `DIRECTOR`/`ADMIN` → Team members with `isAdmin: true` (fallback to `isOwner: true`)

The function now accepts an optional `requesterId` parameter for MANAGER role routing.

---

### Multi-Level Approval Chain

**Status:** COMPLETED (January 2026)

**Implementation:**
WhatsApp notifications are now sent when approval moves to the next level:

- Added `notifyNextLevelApproversViaWhatsApp()` function in `src/lib/whatsapp/approval-integration.ts`
- Updated all approval routes to call this function when a step is approved and there are remaining pending steps
- Both in-app and WhatsApp notifications are sent to next-level approvers

**Files Modified:**
- `src/lib/whatsapp/approval-integration.ts` - Added new function and updated role routing
- `src/app/api/approval-steps/[id]/approve/route.ts` - Added WhatsApp notification for next level
- All other approval routes updated to pass `requesterId` for proper routing

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

*Last Updated: January 2026*
