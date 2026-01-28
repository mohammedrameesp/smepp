/**
 * @file client-smtp.test.ts
 * @description Tests for email client custom SMTP functionality.
 * @module tests/unit/email
 */

// Mock logger - must be hoisted before imports
jest.mock('@/lib/core/log', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

import { sendEmail } from '@/lib/email/client';
import logger from '@/lib/core/log';

const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock dependencies
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/oauth/utils', () => ({
  decrypt: jest.fn(),
}));

// Mock nodemailer (dynamic import)
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'resend-msg-123' }, error: null }),
    },
  })),
}));

import { prisma } from '@/lib/core/prisma';
import { decrypt } from '@/lib/oauth/utils';

describe('Email Client - Custom SMTP', () => {
  const mockPrismaOrg = prisma.organization as jest.Mocked<typeof prisma.organization>;
  const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.RESEND_API_KEY;
  });

  describe('Custom SMTP Configuration', () => {
    it('should use custom SMTP when organization has valid configuration', async () => {
      // Setup: Organization with custom SMTP
      mockPrismaOrg.findUnique.mockResolvedValue({
        id: 'org_123',
        customSmtpHost: 'smtp.example.com',
        customSmtpPort: 587,
        customSmtpUser: 'smtp-user',
        customSmtpPassword: 'encrypted-password',
        customSmtpSecure: false,
        customEmailFrom: 'noreply@example.com',
        customEmailName: 'Example Corp',
      } as any);
      mockDecrypt.mockReturnValue('decrypted-password');
      mockSendMail.mockResolvedValue({ messageId: 'custom-smtp-123' });

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test Email',
        html: '<p>Hello</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('custom-smtp-123');
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Example Corp" <noreply@example.com>',
        to: 'user@test.com',
        subject: 'Test Email',
        text: 'Test Email',
        html: '<p>Hello</p>',
      });
    });

    it('should use plain from address when customEmailName is not set', async () => {
      mockPrismaOrg.findUnique.mockResolvedValue({
        id: 'org_123',
        customSmtpHost: 'smtp.example.com',
        customSmtpPort: 587,
        customSmtpUser: 'smtp-user',
        customSmtpPassword: 'encrypted-password',
        customSmtpSecure: true,
        customEmailFrom: 'noreply@example.com',
        customEmailName: null, // No display name
      } as any);
      mockDecrypt.mockReturnValue('decrypted-password');
      mockSendMail.mockResolvedValue({ messageId: 'smtp-456' });

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com', // Plain address without name
        })
      );
    });

    it('should fall back to Resend when custom SMTP is not configured', async () => {
      // Organization without custom SMTP
      mockPrismaOrg.findUnique.mockResolvedValue({
        id: 'org_123',
        customSmtpHost: null,
        customSmtpPort: null,
        customSmtpUser: null,
        customSmtpPassword: null,
        customSmtpSecure: null,
        customEmailFrom: null,
        customEmailName: null,
      } as any);

      // Enable Resend
      process.env.RESEND_API_KEY = 'test-api-key';

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled(); // Custom SMTP not used
    });

    it('should fall back to Resend when SMTP password decryption fails', async () => {
      mockPrismaOrg.findUnique.mockResolvedValue({
        id: 'org_123',
        customSmtpHost: 'smtp.example.com',
        customSmtpPort: 587,
        customSmtpUser: 'smtp-user',
        customSmtpPassword: 'encrypted-password',
        customSmtpSecure: false,
        customEmailFrom: 'noreply@example.com',
        customEmailName: 'Example Corp',
      } as any);
      mockDecrypt.mockReturnValue(null as unknown as string); // Decryption failed

      process.env.RESEND_API_KEY = 'test-api-key';

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'org_123' }),
        'Failed to decrypt SMTP password for organization'
      );
    });

    it('should return error when custom SMTP sending fails', async () => {
      mockPrismaOrg.findUnique.mockResolvedValue({
        id: 'org_123',
        customSmtpHost: 'smtp.example.com',
        customSmtpPort: 587,
        customSmtpUser: 'smtp-user',
        customSmtpPassword: 'encrypted-password',
        customSmtpSecure: false,
        customEmailFrom: 'noreply@example.com',
        customEmailName: 'Example Corp',
      } as any);
      mockDecrypt.mockReturnValue('decrypted-password');
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection refused');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'SMTP connection refused',
          tenantId: 'org_123',
        }),
        'Custom SMTP email failed'
      );
    });

    it('should handle database errors when fetching organization', async () => {
      mockPrismaOrg.findUnique.mockRejectedValue(new Error('Database connection error'));

      process.env.RESEND_API_KEY = 'test-api-key';

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      // Should fall back to Resend after logging error
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database connection error',
          tenantId: 'org_123',
        }),
        'Failed to get custom SMTP transporter'
      );
    });
  });

  describe('Internal Email Filtering', () => {
    it('should skip .internal email addresses', async () => {
      const result = await sendEmail({
        to: 'nologin-123@acme.internal',
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should filter out .internal addresses from mixed recipients', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      // No tenant ID, so no custom SMTP lookup
      const result = await sendEmail({
        to: ['real@example.com', 'nologin-123@acme.internal'],
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result.success).toBe(true);
      // Resend should be called with only the real address
    });

    it('should skip entirely when all recipients are .internal', async () => {
      const result = await sendEmail({
        to: ['nologin-1@acme.internal', 'nologin-2@acme.internal'],
        subject: 'Test',
        html: '<p>Hi</p>',
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe('Development Mode', () => {
    it('should skip sending when RESEND_API_KEY is not set and no custom SMTP', async () => {
      delete process.env.RESEND_API_KEY;
      mockPrismaOrg.findUnique.mockResolvedValue(null);

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        tenantId: 'org_123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('dev-mode-skipped');
    });
  });
});
