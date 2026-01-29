/**
 * @file whatsapp-verification-check.test.ts
 * @description Unit tests for WhatsApp verification check utility
 */

import {
  checkWhatsAppVerificationNeeded,
  snoozeWhatsAppPrompt,
  clearWhatsAppPromptSnooze,
  clearAllWhatsAppPromptSnoozes,
} from '@/lib/utils/whatsapp-verification-check';
import { prisma } from '@/lib/core/prisma';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WhatsApp Verification Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWhatsAppVerificationNeeded', () => {
    const tenantId = 'tenant-123';
    const memberId = 'member-456';

    // Default mock uses PLATFORM source (no custom config needed)
    const mockOrg = (overrides = {}) => ({
      whatsAppSource: 'PLATFORM',
      whatsAppPlatformEnabled: true,
      whatsAppConfig: null, // PLATFORM source doesn't use tenant config
      ...overrides,
    });

    const mockMember = (overrides = {}) => ({
      isAdmin: true,
      canApprove: false,
      qatarMobile: '+974 5551234',
      whatsAppPromptSnoozedUntil: null,
      whatsAppPhone: null,
      ...overrides,
    });

    describe('when WhatsApp disabled', () => {
      it('should return needsVerification: false when source is NONE', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({ whatsAppSource: 'NONE' })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(false);
      });

      it('should return needsVerification: false when PLATFORM not enabled for tenant', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({ whatsAppSource: 'PLATFORM', whatsAppPlatformEnabled: false })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(false);
      });

      it('should return needsVerification: false when CUSTOM source but config not active', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({
            whatsAppSource: 'CUSTOM',
            whatsAppPlatformEnabled: false,
            whatsAppConfig: { isActive: false },
          })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(false);
      });

      it('should return needsVerification: false when CUSTOM source but no config', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({
            whatsAppSource: 'CUSTOM',
            whatsAppPlatformEnabled: false,
            whatsAppConfig: null,
          })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(false);
      });
    });

    describe('when WhatsApp enabled via different sources', () => {
      it('should return isWhatsAppEnabled: true for PLATFORM source with platformEnabled', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({
            whatsAppSource: 'PLATFORM',
            whatsAppPlatformEnabled: true,
            whatsAppConfig: null, // No custom config needed for PLATFORM
          })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.isWhatsAppEnabled).toBe(true);
        expect(result.needsVerification).toBe(true);
      });

      it('should return isWhatsAppEnabled: true for CUSTOM source with active config', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(
          mockOrg({
            whatsAppSource: 'CUSTOM',
            whatsAppPlatformEnabled: false,
            whatsAppConfig: { isActive: true },
          })
        );
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.isWhatsAppEnabled).toBe(true);
        expect(result.needsVerification).toBe(true);
      });
    });

    describe('when user not eligible', () => {
      it('should return needsVerification: false when user is not admin and cannot approve', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ isAdmin: false, canApprove: false })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isEligible).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(true);
      });
    });

    describe('when already verified', () => {
      it('should return needsVerification: false when user has verified phone', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({
            whatsAppPhone: { phoneNumber: '+97455512345', isVerified: true },
          })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isVerified).toBe(true);
        expect(result.isEligible).toBe(true);
        expect(result.isWhatsAppEnabled).toBe(true);
      });
    });

    describe('when snoozed', () => {
      it('should return needsVerification: false when prompt is snoozed', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);

        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ whatsAppPromptSnoozedUntil: futureDate })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isSnoozed).toBe(true);
        expect(result.isEligible).toBe(true);
        expect(result.isWhatsAppEnabled).toBe(true);
      });

      it('should return needsVerification: true when snooze has expired', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ whatsAppPromptSnoozedUntil: pastDate })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(true);
        expect(result.isSnoozed).toBe(false);
      });
    });

    describe('when all conditions met', () => {
      it('should return needsVerification: true for admin without verification', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ isAdmin: true })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(true);
        expect(result.isEligible).toBe(true);
        expect(result.isWhatsAppEnabled).toBe(true);
        expect(result.isVerified).toBe(false);
        expect(result.isSnoozed).toBe(false);
      });

      it('should return needsVerification: true for user who can approve', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ isAdmin: false, canApprove: true })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(true);
        expect(result.isEligible).toBe(true);
      });

      it('should extract phone number from profile', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ qatarMobile: '+974 5551234' })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.phoneNumber).toBe('5551234');
        expect(result.countryCode).toBe('+974');
      });

      it('should assume Qatar country code when not provided', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(
          mockMember({ qatarMobile: '5551234' })
        );

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.phoneNumber).toBe('5551234');
        expect(result.countryCode).toBe('+974');
      });
    });

    describe('when org or member not found', () => {
      it('should return default result when org not found', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(mockMember());

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isWhatsAppEnabled).toBe(false);
        expect(result.isEligible).toBe(false);
      });

      it('should return default result when member not found', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg());
        (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await checkWhatsAppVerificationNeeded(tenantId, memberId);

        expect(result.needsVerification).toBe(false);
        expect(result.isEligible).toBe(false);
      });
    });
  });

  describe('snoozeWhatsAppPrompt', () => {
    it('should set correct expiration date', async () => {
      const memberId = 'member-123';
      (mockPrisma.teamMember.update as jest.Mock).mockResolvedValue({});

      const result = await snoozeWhatsAppPrompt(memberId);

      expect(mockPrisma.teamMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { whatsAppPromptSnoozedUntil: expect.any(Date) },
      });

      // Default is 3 days
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 3);
      expect(result.getDate()).toBe(expectedDate.getDate());
    });

    it('should use custom days parameter', async () => {
      const memberId = 'member-123';
      (mockPrisma.teamMember.update as jest.Mock).mockResolvedValue({});

      const result = await snoozeWhatsAppPrompt(memberId, 7);

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      expect(result.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe('clearWhatsAppPromptSnooze', () => {
    it('should clear snooze for a member', async () => {
      const memberId = 'member-123';
      (mockPrisma.teamMember.update as jest.Mock).mockResolvedValue({});

      await clearWhatsAppPromptSnooze(memberId);

      expect(mockPrisma.teamMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { whatsAppPromptSnoozedUntil: null },
      });
    });
  });

  describe('clearAllWhatsAppPromptSnoozes', () => {
    const tenantId = 'tenant-123';

    it('should filter correctly and clear snoozes for unverified eligible members', async () => {
      (mockPrisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { id: 'member-1', whatsAppPhone: null },
        { id: 'member-2', whatsAppPhone: { isVerified: false } },
        { id: 'member-3', whatsAppPhone: { isVerified: true } }, // Already verified
      ]);
      (mockPrisma.teamMember.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await clearAllWhatsAppPromptSnoozes(tenantId);

      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          OR: [{ isAdmin: true }, { canApprove: true }],
        },
        select: {
          id: true,
          whatsAppPhone: { select: { isVerified: true } },
        },
      });

      expect(mockPrisma.teamMember.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['member-1', 'member-2'] } },
        data: { whatsAppPromptSnoozedUntil: null },
      });

      expect(result).toBe(2);
    });

    it('should return 0 when no unverified eligible members', async () => {
      (mockPrisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { id: 'member-1', whatsAppPhone: { isVerified: true } },
        { id: 'member-2', whatsAppPhone: { isVerified: true } },
      ]);

      const result = await clearAllWhatsAppPromptSnoozes(tenantId);

      expect(mockPrisma.teamMember.updateMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should return 0 when no eligible members at all', async () => {
      (mockPrisma.teamMember.findMany as jest.Mock).mockResolvedValue([]);

      const result = await clearAllWhatsAppPromptSnoozes(tenantId);

      expect(mockPrisma.teamMember.updateMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
