/**
 * @file failure-handler.test.ts
 * @description Tests for email failure handler including rate limiting logic.
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

import { handleEmailFailure, getOrganizationContext, type EmailFailureContext } from '@/lib/email/failure-handler';
import logger from '@/lib/core/log';

const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock dependencies
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    teamMember: {
      findMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    emailFailureLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/client', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/features/notifications/lib/notification-service', () => ({
  createBulkNotifications: jest.fn(),
}));

// Mock dynamic import for email template
jest.mock('@/lib/email/templates/email-failures', () => ({
  emailFailureAlertEmail: jest.fn().mockReturnValue({
    subject: 'Test Failure Alert',
    html: '<p>Test</p>',
    text: 'Test',
  }),
}));

import { prisma } from '@/lib/core/prisma';
import { sendEmail } from '@/lib/email/client';
import { createBulkNotifications } from '@/features/notifications/lib/notification-service';

describe('Email Failure Handler', () => {
  const mockPrismaTeamMember = prisma.teamMember as jest.Mocked<typeof prisma.teamMember>;
  const mockPrismaOrg = prisma.organization as jest.Mocked<typeof prisma.organization>;
  const mockPrismaEmailFailureLog = prisma.emailFailureLog as jest.Mocked<typeof prisma.emailFailureLog>;
  const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
  const mockCreateBulkNotifications = createBulkNotifications as jest.MockedFunction<typeof createBulkNotifications>;

  // Use a function to generate unique context for each test to avoid rate limiting
  let testCounter = 0;
  const createContext = (overrides: Partial<EmailFailureContext> = {}): EmailFailureContext => {
    const counter = ++testCounter;
    return {
      module: overrides.module || 'assets',
      action: 'assignment',
      tenantId: `org_${counter}`, // Unique tenant for each call
      organizationName: 'Acme Corp',
      organizationSlug: 'acme',
      recipientEmail: overrides.recipientEmail || `user${counter}@example.com`, // Unique recipient
      recipientName: 'John Doe',
      emailSubject: 'Asset Assignment',
      error: 'SMTP connection failed',
    };
  };

  // For tests that need a stable context
  const baseContext: EmailFailureContext = {
    module: 'assets',
    action: 'assignment',
    tenantId: 'org_stable',
    organizationName: 'Acme Corp',
    organizationSlug: 'acme',
    recipientEmail: 'user@example.com',
    recipientName: 'John Doe',
    emailSubject: 'Asset Assignment',
    error: 'SMTP connection failed',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockPrismaTeamMember.findMany.mockResolvedValue([]);
    (mockPrismaEmailFailureLog.create as jest.Mock).mockResolvedValue({} as any);
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });
    (mockCreateBulkNotifications as jest.Mock).mockResolvedValue(undefined);

    // Set super admin email for tests
    process.env.SUPER_ADMIN_EMAIL = 'admin@durj.com';
  });

  afterEach(() => {
    delete process.env.SUPER_ADMIN_EMAIL;
  });

  describe('Rate Limiting', () => {
    // Use a specific context for rate limiting tests (separate from other tests)
    const rateLimitContext: EmailFailureContext = {
      module: 'other', // Use a valid module type
      action: 'test-action',
      tenantId: 'org_rate_limit',
      organizationName: 'Rate Test Corp',
      organizationSlug: 'rate-test',
      recipientEmail: 'ratelimit@example.com',
      recipientName: 'Rate Test User',
      emailSubject: 'Rate Limit Test',
      error: 'Test error',
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process first failure alert immediately', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      await handleEmailFailure(context);

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalled();
      expect(mockCreateBulkNotifications).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('should skip duplicate alerts within cooldown period', async () => {
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // First call - should process
      await handleEmailFailure(rateLimitContext);
      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(1);

      // Second call immediately with SAME context - should be rate limited
      await handleEmailFailure(rateLimitContext);
      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(1); // Still 1
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ alertKey: expect.any(String) }),
        'Skipping duplicate email failure alert (rate limited)'
      );
    });

    it('should allow alerts after cooldown period expires', async () => {
      const context: EmailFailureContext = {
        ...rateLimitContext,
        recipientEmail: 'cooldown-test@example.com',
      };
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // First call
      await handleEmailFailure(context);
      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(1);

      // Advance time past cooldown (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Second call - should process after cooldown
      await handleEmailFailure(context);
      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(2);
    });

    it('should track separate alerts for different recipients', async () => {
      const context1 = createContext();
      const context2 = { ...context1, recipientEmail: 'different@example.com' };
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // First recipient
      await handleEmailFailure(context1);

      // Different recipient - should not be rate limited
      await handleEmailFailure(context2);

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(2);
    });

    it('should track separate alerts for different modules', async () => {
      const baseCtx = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // Assets module
      await handleEmailFailure({ ...baseCtx, module: 'assets' });

      // Leave module - should not be rate limited (different module)
      await handleEmailFailure({ ...baseCtx, module: 'leave' });

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(2);
    });

    it('should track separate alerts for different tenants', async () => {
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // First tenant
      const ctx1 = createContext();
      await handleEmailFailure(ctx1);

      // Different tenant - should not be rate limited
      const ctx2 = createContext();
      await handleEmailFailure(ctx2);

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(2);
    });

    it('should clean up old rate limit entries when map grows large', async () => {
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      // Create many unique alerts to trigger cleanup (> 100)
      for (let i = 0; i < 105; i++) {
        await handleEmailFailure(createContext({ recipientEmail: `cleanup${i}@example.com` }));
      }

      // The cleanup should have run, but all recent entries should still work
      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledTimes(105);
    });
  });

  describe('Tenant Admin Notifications', () => {
    it('should notify all tenant admins via in-app notification', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([
        { id: 'admin1' },
        { id: 'admin2' },
        { id: 'admin3' },
      ] as any[]);

      await handleEmailFailure(context);

      expect(mockCreateBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ recipientId: 'admin1' }),
          expect.objectContaining({ recipientId: 'admin2' }),
          expect.objectContaining({ recipientId: 'admin3' }),
        ]),
        context.tenantId
      );
    });

    it('should include error details in notification message', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      await handleEmailFailure(context);

      expect(mockCreateBulkNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Email Notification Failed',
            message: expect.stringContaining('assignment'),
          }),
        ]),
        context.tenantId
      );
    });

    it('should handle case when no admins exist', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([]);

      await handleEmailFailure(context);

      expect(mockCreateBulkNotifications).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: context.tenantId }),
        'No tenant admins to notify about email failure'
      );
    });

    it('should handle notification creation errors gracefully', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);
      (mockCreateBulkNotifications as jest.Mock).mockRejectedValue(new Error('Notification service error'));

      // Should not throw
      await expect(handleEmailFailure(context)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Notification service error',
          tenantId: context.tenantId,
        }),
        'Failed to notify tenant admins about email failure'
      );
    });
  });

  describe('Super Admin Email Notification', () => {
    it('should send email to super admin when configured', async () => {
      const context = createContext();
      await handleEmailFailure(context);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'admin@durj.com',
        subject: 'Test Failure Alert',
        html: '<p>Test</p>',
        text: 'Test',
      });
    });

    it('should log warning when SUPER_ADMIN_EMAIL is not configured', async () => {
      const context = createContext();
      delete process.env.SUPER_ADMIN_EMAIL;

      await handleEmailFailure(context);

      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SUPER_ADMIN_EMAIL not configured - cannot send email failure alert'
      );
    });

    it('should log error when super admin email fails to send', async () => {
      const context = createContext();
      mockSendEmail.mockResolvedValue({ success: false, error: 'Quota exceeded' });

      await handleEmailFailure(context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Quota exceeded',
          tenantId: context.tenantId,
        }),
        'Failed to send email failure alert to super admin'
      );
    });

    it('should not recurse when super admin notification fails', async () => {
      const context = createContext();
      mockSendEmail.mockRejectedValue(new Error('Send failed'));

      // Should not throw or cause infinite loop
      await expect(handleEmailFailure(context)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Send failed' }),
        'Exception while notifying super admin about email failure'
      );
    });
  });

  describe('Database Persistence', () => {
    it('should persist failure to database', async () => {
      const context = createContext();
      await handleEmailFailure(context);

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: context.tenantId,
          module: 'assets',
          action: 'assignment',
          organizationName: 'Acme Corp',
          organizationSlug: 'acme',
          recipientEmail: context.recipientEmail,
          recipientName: 'John Doe',
          emailSubject: 'Asset Assignment',
          error: 'SMTP connection failed',
          errorCode: undefined,
          metadata: undefined,
        },
      });
    });

    it('should persist metadata when provided', async () => {
      const context = createContext();
      const contextWithMeta: EmailFailureContext = {
        ...context,
        errorCode: 'SMTP_TIMEOUT',
        metadata: { requestId: 'req-123', retryCount: 3 },
      };
      await handleEmailFailure(contextWithMeta);

      expect(mockPrismaEmailFailureLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorCode: 'SMTP_TIMEOUT',
          metadata: { requestId: 'req-123', retryCount: 3 },
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      const context = createContext();
      (mockPrismaEmailFailureLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(handleEmailFailure(context)).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
          tenantId: context.tenantId,
        }),
        'Failed to persist email failure to database'
      );
    });
  });

  describe('Parallel Execution', () => {
    it('should run all operations in parallel', async () => {
      const context = createContext();
      mockPrismaTeamMember.findMany.mockResolvedValue([{ id: 'admin1' } as any]);

      const startTime = Date.now();

      // Add delays to mock operations
      (mockPrismaEmailFailureLog.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as any), 100))
      );
      (mockCreateBulkNotifications as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockSendEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      await handleEmailFailure(context);

      const elapsed = Date.now() - startTime;

      // If running in parallel, should take ~100ms, not 300ms
      // Allow some buffer for test execution overhead
      expect(elapsed).toBeLessThan(250);
    });
  });
});

describe('getOrganizationContext', () => {
  const mockPrismaOrg = prisma.organization as jest.Mocked<typeof prisma.organization>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return organization name and slug', async () => {
    mockPrismaOrg.findUnique.mockResolvedValue({
      name: 'Acme Corp',
      slug: 'acme',
    } as any);

    const result = await getOrganizationContext('org_123');

    expect(result).toEqual({
      name: 'Acme Corp',
      slug: 'acme',
    });
    expect(mockPrismaOrg.findUnique).toHaveBeenCalledWith({
      where: { id: 'org_123' },
      select: { name: true, slug: true },
    });
  });

  it('should return null when organization not found', async () => {
    mockPrismaOrg.findUnique.mockResolvedValue(null);

    const result = await getOrganizationContext('nonexistent');

    expect(result).toBeNull();
  });

  it('should return null and log error on database failure', async () => {
    mockPrismaOrg.findUnique.mockRejectedValue(new Error('Connection error'));

    const result = await getOrganizationContext('org_123');

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Connection error',
        tenantId: 'org_123',
      }),
      'Failed to get organization context for email failure'
    );
  });
});
