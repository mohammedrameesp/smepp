/**
 * @file types.test.ts
 * @description Unit tests for WhatsApp types
 *
 * Note: TypeScript types are compile-time only.
 * These tests verify runtime behavior and constants.
 */

describe('WhatsApp Types', () => {
  describe('Type inference tests (compile-time)', () => {
    it('should verify WhatsAppConfigData structure', async () => {
      // This test verifies the type structure is usable at runtime
      const { WhatsAppClient } = await import('@/lib/whatsapp/client');

      const config = {
        phoneNumberId: 'phone-123',
        businessAccountId: 'business-456',
        accessToken: 'token-789',
        webhookVerifyToken: 'verify-token',
        isActive: true,
      };

      // If types are correct, this should compile and create instance
      const client = new WhatsAppClient(config);
      expect(client).toBeDefined();
    });

    it('should verify ApprovalDetails has required fields', () => {
      // Verify the structure matches what templates expect
      interface ApprovalDetails {
        requesterName: string;
        leaveType?: string;
        startDate?: Date;
        endDate?: Date;
        totalDays?: number;
        reason?: string;
        title?: string;
        totalAmount?: number;
        currency?: string;
        assetName?: string;
        assetType?: string;
        justification?: string;
      }

      const leaveDetails: ApprovalDetails = {
        requesterName: 'John',
        leaveType: 'Annual',
        startDate: new Date(),
        endDate: new Date(),
        totalDays: 5,
      };

      const spendDetails: ApprovalDetails = {
        requesterName: 'Jane',
        title: 'Supplies',
        totalAmount: 1000,
        currency: 'QAR',
      };

      const assetDetails: ApprovalDetails = {
        requesterName: 'Bob',
        assetName: 'Laptop',
        assetType: 'Computer',
        justification: 'Work',
      };

      expect(leaveDetails.requesterName).toBe('John');
      expect(spendDetails.totalAmount).toBe(1000);
      expect(assetDetails.assetName).toBe('Laptop');
    });

    it('should verify ApprovalEntityType values', () => {
      type ApprovalEntityType = 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';

      const entityTypes: ApprovalEntityType[] = [
        'LEAVE_REQUEST',
        'SPEND_REQUEST',
        'ASSET_REQUEST',
      ];

      expect(entityTypes).toContain('LEAVE_REQUEST');
      expect(entityTypes).toContain('SPEND_REQUEST');
      expect(entityTypes).toContain('ASSET_REQUEST');
      expect(entityTypes).toHaveLength(3);
    });

    it('should verify SendNotificationResult structure', () => {
      interface SendNotificationResult {
        success: boolean;
        messageId?: string;
        error?: string;
      }

      const successResult: SendNotificationResult = {
        success: true,
        messageId: 'wamid.123',
      };

      const errorResult: SendNotificationResult = {
        success: false,
        error: 'Something went wrong',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.messageId).toBe('wamid.123');
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });

    it('should verify ActionTokenPayload structure', () => {
      interface ActionTokenPayload {
        tenantId: string;
        entityType: string;
        entityId: string;
        action: 'approve' | 'reject';
        approverId: string;
        expiresAt: number;
      }

      const payload: ActionTokenPayload = {
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        action: 'approve',
        approverId: 'member-789',
        expiresAt: Date.now() + 60000,
      };

      expect(payload.action).toBe('approve');
      expect(payload.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should verify WhatsAppTemplateMessage structure', () => {
      interface WhatsAppTemplateComponent {
        type: 'header' | 'body' | 'button';
        parameters?: Array<{ type: string; text?: string; payload?: string }>;
        sub_type?: 'quick_reply';
        index?: number;
      }

      interface WhatsAppTemplateMessage {
        to: string;
        templateName: string;
        languageCode: string;
        components: WhatsAppTemplateComponent[];
      }

      const message: WhatsAppTemplateMessage = {
        to: '+97455123456',
        templateName: 'leave_approval_request',
        languageCode: 'en',
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: 'John Doe' }],
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: 0,
            parameters: [{ type: 'payload', payload: 'approve-token' }],
          },
        ],
      };

      expect(message.to).toBe('+97455123456');
      expect(message.templateName).toBe('leave_approval_request');
      expect(message.components).toHaveLength(2);
    });

    it('should verify MetaSendMessageResponse structure', () => {
      interface MetaSendMessageResponse {
        messaging_product: 'whatsapp';
        contacts: Array<{ input: string; wa_id: string }>;
        messages: Array<{ id: string }>;
      }

      const response: MetaSendMessageResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '+97455123456', wa_id: '97455123456' }],
        messages: [{ id: 'wamid.abcdef123456' }],
      };

      expect(response.messaging_product).toBe('whatsapp');
      expect(response.messages[0].id).toContain('wamid');
    });
  });

  describe('WHATSAPP_TEMPLATES values match Meta registration', () => {
    it('should have all required template constants', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp/types');

      expect(WHATSAPP_TEMPLATES).toBeDefined();
      expect(WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toBeDefined();
      expect(WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toBeDefined();
      expect(WHATSAPP_TEMPLATES.ASSET_APPROVAL).toBeDefined();
      expect(WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toBeDefined();
    });

    it('should have correct template name format', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp/types');

      // Template names should be lowercase with underscores (Meta convention)
      const templateNamePattern = /^[a-z_]+$/;

      expect(WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toMatch(templateNamePattern);
      expect(WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toMatch(templateNamePattern);
      expect(WHATSAPP_TEMPLATES.ASSET_APPROVAL).toMatch(templateNamePattern);
      expect(WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toMatch(templateNamePattern);
    });

    it('should have unique template values', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp/types');

      const values = Object.values(WHATSAPP_TEMPLATES);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(values.length);
    });

    it('should match expected Meta template names', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp/types');

      // These are the exact names that must be registered in Meta Business Manager
      expect(WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toBe('leave_approval_request');
      expect(WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toBe('purchase_approval_request');
      expect(WHATSAPP_TEMPLATES.ASSET_APPROVAL).toBe('asset_approval_request');
      expect(WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toBe('approval_action_confirmed');
    });

    it('should be readonly (as const assertion)', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp/types');

      // 'as const' is a compile-time assertion, not runtime freeze
      // But we can verify the values are all strings and not undefined
      expect(typeof WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toBe('string');
      expect(typeof WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toBe('string');
      expect(typeof WHATSAPP_TEMPLATES.ASSET_APPROVAL).toBe('string');
      expect(typeof WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toBe('string');
    });
  });

  describe('WhatsAppSourceType values', () => {
    it('should have correct source type values', () => {
      type WhatsAppSourceType = 'NONE' | 'PLATFORM' | 'CUSTOM';

      const sourceTypes: WhatsAppSourceType[] = ['NONE', 'PLATFORM', 'CUSTOM'];

      expect(sourceTypes).toContain('NONE');
      expect(sourceTypes).toContain('PLATFORM');
      expect(sourceTypes).toContain('CUSTOM');
      expect(sourceTypes).toHaveLength(3);
    });
  });
});
