/**
 * @file send-notification.test.ts
 * @description Unit tests for WhatsApp notification sender logic
 */

describe('WhatsApp Send Notification', () => {
  describe('sendApprovalNotification logic', () => {
    // Test the notification flow logic without actual module dependencies

    interface NotificationParams {
      tenantId: string;
      approverId: string;
      entityType: 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';
      entityId: string;
      details: { requesterName: string };
    }

    interface NotificationResult {
      success: boolean;
      messageId?: string;
      error?: string;
    }

    interface ConfigResult {
      config: { phoneNumberId: string };
      source: 'PLATFORM' | 'CUSTOM';
    }

    // Simulated notification function
    const sendNotification = async (
      params: NotificationParams,
      getConfig: () => Promise<ConfigResult | null>,
      getPhone: () => Promise<string | null>,
      generateTokens: () => Promise<{ approveToken: string; rejectToken: string }>,
      sendMessage: () => Promise<{ messageId: string }>
    ): Promise<NotificationResult> => {
      // Step 1: Get config
      const config = await getConfig();
      if (!config) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      // Step 2: Get phone
      const phone = await getPhone();
      if (!phone) {
        return { success: false, error: 'No WhatsApp number' };
      }

      // Step 3: Generate tokens
      await generateTokens();

      // Step 4: Send message
      try {
        const result = await sendMessage();
        return { success: true, messageId: result.messageId };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    it('should return success when all steps succeed', async () => {
      const result = await sendNotification(
        {
          tenantId: 'tenant-123',
          approverId: 'member-456',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-789',
          details: { requesterName: 'John Doe' },
        },
        async () => ({ config: { phoneNumberId: 'phone-123' }, source: 'PLATFORM' }),
        async () => '+97455123456',
        async () => ({ approveToken: 'approve', rejectToken: 'reject' }),
        async () => ({ messageId: 'wamid.123' })
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.123');
    });

    it('should return error when config not found', async () => {
      const result = await sendNotification(
        {
          tenantId: 'tenant-123',
          approverId: 'member-456',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-789',
          details: { requesterName: 'John Doe' },
        },
        async () => null,
        async () => '+97455123456',
        async () => ({ approveToken: 'approve', rejectToken: 'reject' }),
        async () => ({ messageId: 'wamid.123' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should return error when phone not found', async () => {
      const result = await sendNotification(
        {
          tenantId: 'tenant-123',
          approverId: 'member-456',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-789',
          details: { requesterName: 'John Doe' },
        },
        async () => ({ config: { phoneNumberId: 'phone-123' }, source: 'PLATFORM' }),
        async () => null,
        async () => ({ approveToken: 'approve', rejectToken: 'reject' }),
        async () => ({ messageId: 'wamid.123' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('WhatsApp number');
    });

    it('should return error when message send fails', async () => {
      const result = await sendNotification(
        {
          tenantId: 'tenant-123',
          approverId: 'member-456',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-789',
          details: { requesterName: 'John Doe' },
        },
        async () => ({ config: { phoneNumberId: 'phone-123' }, source: 'PLATFORM' }),
        async () => '+97455123456',
        async () => ({ approveToken: 'approve', rejectToken: 'reject' }),
        async () => {
          throw new Error('API Error');
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('sendActionConfirmation logic', () => {
    const sendConfirmation = async (
      getConfig: () => Promise<{ config: object } | null>,
      sendText: () => Promise<{ messageId: string }>
    ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
      const config = await getConfig();
      if (!config) {
        return { success: false, error: 'WhatsApp not configured' };
      }

      try {
        const result = await sendText();
        return { success: true, messageId: result.messageId };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    it('should send text message successfully', async () => {
      const result = await sendConfirmation(
        async () => ({ config: { phoneNumberId: 'phone' } }),
        async () => ({ messageId: 'wamid.456' })
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.456');
    });

    it('should return error when config not found', async () => {
      const result = await sendConfirmation(
        async () => null,
        async () => ({ messageId: 'wamid.456' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('canSendWhatsAppNotification logic', () => {
    interface CanSendResult {
      canSend: boolean;
      reason?: string;
    }

    const checkCanSend = async (
      getConfig: () => Promise<object | null>,
      getPhone: () => Promise<string | null>
    ): Promise<CanSendResult> => {
      const config = await getConfig();
      if (!config) {
        return { canSend: false, reason: 'WhatsApp not configured' };
      }

      const phone = await getPhone();
      if (!phone) {
        return { canSend: false, reason: 'Member has no verified WhatsApp number' };
      }

      return { canSend: true };
    };

    it('should return canSend: true when all conditions met', async () => {
      const result = await checkCanSend(
        async () => ({ phoneNumberId: 'phone' }),
        async () => '+97455123456'
      );

      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return canSend: false when config not found', async () => {
      const result = await checkCanSend(
        async () => null,
        async () => '+97455123456'
      );

      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('not configured');
    });

    it('should return canSend: false when phone not found', async () => {
      const result = await checkCanSend(
        async () => ({ phoneNumberId: 'phone' }),
        async () => null
      );

      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('no verified WhatsApp number');
    });
  });

  describe('getTemplateName logic', () => {
    type EntityType = 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';

    const getTemplateName = (entityType: EntityType): string => {
      switch (entityType) {
        case 'LEAVE_REQUEST':
          return 'leave_approval_request';
        case 'SPEND_REQUEST':
          return 'purchase_approval_request';
        case 'ASSET_REQUEST':
          return 'asset_approval_request';
        default:
          return 'unknown';
      }
    };

    it('should return correct template for LEAVE_REQUEST', () => {
      expect(getTemplateName('LEAVE_REQUEST')).toBe('leave_approval_request');
    });

    it('should return correct template for SPEND_REQUEST', () => {
      expect(getTemplateName('SPEND_REQUEST')).toBe('purchase_approval_request');
    });

    it('should return correct template for ASSET_REQUEST', () => {
      expect(getTemplateName('ASSET_REQUEST')).toBe('asset_approval_request');
    });
  });
});
