/**
 * @file whatsapp-verification-check.ts
 * @description Utility to check if a user needs WhatsApp verification
 * @module lib/utils
 *
 * Verification is required when:
 * 1. Organization has WhatsApp enabled (source !== NONE)
 * 2. User is eligible (isAdmin OR canApprove)
 * 3. User is not yet verified
 * 4. User hasn't snoozed the prompt (or snooze has expired)
 */

import { prisma } from '@/lib/core/prisma';

export interface WhatsAppVerificationCheckResult {
  needsVerification: boolean;
  phoneNumber: string | null;
  countryCode: string | null;
  isSnoozed: boolean;
  isEligible: boolean;
  isWhatsAppEnabled: boolean;
  isVerified: boolean;
}

/**
 * Check if a user needs to verify their WhatsApp number
 *
 * @param tenantId - The organization ID
 * @param memberId - The team member ID
 * @returns Verification check result with all relevant status flags
 */
export async function checkWhatsAppVerificationNeeded(
  tenantId: string,
  memberId: string
): Promise<WhatsAppVerificationCheckResult> {
  // Fetch organization and member data in parallel
  const [org, member] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        whatsAppSource: true,
        whatsAppPlatformEnabled: true,
        whatsAppConfig: {
          select: { isActive: true },
        },
      },
    }),
    prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        isAdmin: true,
        canApprove: true,
        qatarMobile: true,
        phone: true,
        whatsAppPromptSnoozedUntil: true,
        whatsAppPhone: {
          select: {
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    }),
  ]);

  // Default result for missing data
  if (!org || !member) {
    return {
      needsVerification: false,
      phoneNumber: null,
      countryCode: null,
      isSnoozed: false,
      isEligible: false,
      isWhatsAppEnabled: false,
      isVerified: false,
    };
  }

  // Check if WhatsApp is enabled for the organization
  const isWhatsAppEnabled =
    org.whatsAppSource !== 'NONE' &&
    (org.whatsAppConfig?.isActive ?? false);

  // Check if user is eligible (admin or can approve)
  const isEligible = member.isAdmin || member.canApprove;

  // Check if already verified
  const isVerified = member.whatsAppPhone?.isVerified ?? false;

  // Check if snoozed
  const now = new Date();
  const isSnoozed =
    member.whatsAppPromptSnoozedUntil !== null &&
    member.whatsAppPromptSnoozedUntil > now;

  // Get phone number from profile or existing WhatsApp record
  let phoneNumber = member.whatsAppPhone?.phoneNumber || null;
  let countryCode: string | null = null;

  // If no WhatsApp phone, try to get from profile
  if (!phoneNumber) {
    // Prefer Qatar mobile, fall back to general phone
    const profilePhone = member.qatarMobile || member.phone;
    if (profilePhone) {
      // Extract country code if present
      const phoneMatch = profilePhone.match(/^(\+\d{1,4})(.+)$/);
      if (phoneMatch) {
        countryCode = phoneMatch[1];
        phoneNumber = phoneMatch[2].replace(/\D/g, '');
      } else {
        // Assume Qatar if no country code
        countryCode = '+974';
        phoneNumber = profilePhone.replace(/\D/g, '');
      }
    }
  } else {
    // Extract from existing WhatsApp phone
    const phoneMatch = phoneNumber.match(/^(\+\d{1,4})(.+)$/);
    if (phoneMatch) {
      countryCode = phoneMatch[1];
      phoneNumber = phoneMatch[2].replace(/\D/g, '');
    }
  }

  // Determine if verification is needed
  const needsVerification =
    isWhatsAppEnabled && isEligible && !isVerified && !isSnoozed;

  return {
    needsVerification,
    phoneNumber,
    countryCode,
    isSnoozed,
    isEligible,
    isWhatsAppEnabled,
    isVerified,
  };
}

/**
 * Snooze the WhatsApp verification prompt for a user
 *
 * @param memberId - The team member ID
 * @param days - Number of days to snooze (default: 3)
 * @returns The snooze expiration date
 */
export async function snoozeWhatsAppPrompt(
  memberId: string,
  days: number = 3
): Promise<Date> {
  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + days);

  await prisma.teamMember.update({
    where: { id: memberId },
    data: { whatsAppPromptSnoozedUntil: snoozedUntil },
  });

  return snoozedUntil;
}

/**
 * Clear snooze for a user (e.g., when they're promoted to an eligible role)
 *
 * @param memberId - The team member ID
 */
export async function clearWhatsAppPromptSnooze(memberId: string): Promise<void> {
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { whatsAppPromptSnoozedUntil: null },
  });
}

/**
 * Clear snooze for all eligible users in an organization
 * (Used when WhatsApp is first enabled)
 *
 * @param tenantId - The organization ID
 * @returns Number of users affected
 */
export async function clearAllWhatsAppPromptSnoozes(tenantId: string): Promise<number> {
  // First, find eligible members who are NOT verified
  // We need to do this in two steps because Prisma doesn't support
  // OR with null relation check in updateMany
  const eligibleMembers = await prisma.teamMember.findMany({
    where: {
      tenantId,
      OR: [{ isAdmin: true }, { canApprove: true }],
    },
    select: {
      id: true,
      whatsAppPhone: {
        select: { isVerified: true },
      },
    },
  });

  // Filter to only those not verified (no phone record or not verified)
  const unverifiedMemberIds = eligibleMembers
    .filter((m) => !m.whatsAppPhone?.isVerified)
    .map((m) => m.id);

  if (unverifiedMemberIds.length === 0) {
    return 0;
  }

  // Clear snoozes for unverified eligible members
  const result = await prisma.teamMember.updateMany({
    where: {
      id: { in: unverifiedMemberIds },
    },
    data: { whatsAppPromptSnoozedUntil: null },
  });

  return result.count;
}
