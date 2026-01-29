/**
 * @file index.test.ts
 * @description Unit tests for WhatsApp module exports
 */

describe('WhatsApp Module Exports', () => {
  describe('All exports are accessible', () => {
    it('should export type definitions', async () => {
      // Type exports are compile-time only, but we can verify the module loads
      const module = await import('@/lib/whatsapp');

      // Verify WHATSAPP_TEMPLATES constant is exported
      expect(module.WHATSAPP_TEMPLATES).toBeDefined();
      expect(module.WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toBe('leave_approval_request');
      expect(module.WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toBe('purchase_approval_request');
      expect(module.WHATSAPP_TEMPLATES.ASSET_APPROVAL).toBe('asset_approval_request');
      expect(module.WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toBe('approval_action_confirmed');
    });

    it('should export configuration functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.getWhatsAppConfig).toBe('function');
      expect(typeof module.saveWhatsAppConfig).toBe('function');
      expect(typeof module.disableWhatsApp).toBe('function');
      expect(typeof module.getMemberWhatsAppPhone).toBe('function');
      expect(typeof module.saveMemberWhatsAppPhone).toBe('function');
      expect(typeof module.verifyMemberWhatsAppPhone).toBe('function');
      expect(typeof module.encrypt).toBe('function');
      expect(typeof module.decrypt).toBe('function');
    });

    it('should export platform config functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.getPlatformWhatsAppConfig).toBe('function');
      expect(typeof module.savePlatformWhatsAppConfig).toBe('function');
      expect(typeof module.disablePlatformWhatsApp).toBe('function');
      expect(typeof module.getPlatformWhatsAppConfigForDisplay).toBe('function');
    });

    it('should export hybrid config functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.getEffectiveWhatsAppConfig).toBe('function');
      expect(typeof module.updateTenantWhatsAppSource).toBe('function');
      expect(typeof module.setTenantPlatformWhatsAppAccess).toBe('function');
      expect(typeof module.getTenantWhatsAppStatus).toBe('function');
    });

    it('should export client class and functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(module.WhatsAppClient).toBeDefined();
      expect(module.WhatsAppApiError).toBeDefined();
      expect(typeof module.logWhatsAppMessage).toBe('function');
      expect(typeof module.updateMessageStatus).toBe('function');
    });

    it('should export action token functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.generateActionToken).toBe('function');
      expect(typeof module.generateActionTokenPair).toBe('function');
      expect(typeof module.validateAndConsumeToken).toBe('function');
      expect(typeof module.validateToken).toBe('function');
      expect(typeof module.cleanupExpiredTokens).toBe('function');
      expect(typeof module.invalidateTokensForEntity).toBe('function');
    });

    it('should export template builder functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.buildLeaveApprovalTemplate).toBe('function');
      expect(typeof module.buildPurchaseApprovalTemplate).toBe('function');
      expect(typeof module.buildAssetApprovalTemplate).toBe('function');
      expect(typeof module.buildApprovalTemplate).toBe('function');
      expect(typeof module.buildActionConfirmationText).toBe('function');
    });

    it('should export notification sender functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.sendApprovalNotification).toBe('function');
      expect(typeof module.sendActionConfirmation).toBe('function');
      expect(typeof module.canSendWhatsAppNotification).toBe('function');
    });

    it('should export approval integration functions', async () => {
      const module = await import('@/lib/whatsapp');

      expect(typeof module.notifyApproversViaWhatsApp).toBe('function');
      expect(typeof module.notifyNextLevelApproversViaWhatsApp).toBe('function');
    });
  });

  describe('No circular dependencies', () => {
    it('should load module without circular dependency errors', async () => {
      // This test will fail if there are circular dependencies
      // that cause runtime errors
      let error: Error | null = null;

      try {
        // Clear module cache to ensure fresh load
        jest.resetModules();
        await import('@/lib/whatsapp');
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeNull();
    });

    it('should be able to import individual submodules', async () => {
      jest.resetModules();

      // Each submodule should be importable independently
      await expect(import('@/lib/whatsapp/types')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/config')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/client')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/templates')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/action-tokens')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/send-notification')).resolves.toBeDefined();
      await expect(import('@/lib/whatsapp/approval-integration')).resolves.toBeDefined();
    });
  });

  describe('WHATSAPP_TEMPLATES values match Meta registration', () => {
    it('should have correct template names for Meta Business Manager', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp');

      // These names must match exactly what's registered in Meta Business Manager
      expect(WHATSAPP_TEMPLATES.LEAVE_APPROVAL).toBe('leave_approval_request');
      expect(WHATSAPP_TEMPLATES.PURCHASE_APPROVAL).toBe('purchase_approval_request');
      expect(WHATSAPP_TEMPLATES.ASSET_APPROVAL).toBe('asset_approval_request');
      expect(WHATSAPP_TEMPLATES.ACTION_CONFIRMATION).toBe('approval_action_confirmed');
    });

    it('should have all required template constants', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp');

      // Verify all expected templates are defined
      const expectedTemplates = [
        'LEAVE_APPROVAL',
        'PURCHASE_APPROVAL',
        'ASSET_APPROVAL',
        'ACTION_CONFIRMATION',
      ];

      for (const template of expectedTemplates) {
        expect(WHATSAPP_TEMPLATES).toHaveProperty(template);
        expect(typeof (WHATSAPP_TEMPLATES as Record<string, string>)[template]).toBe('string');
      }
    });

    it('should have unique template names', async () => {
      const { WHATSAPP_TEMPLATES } = await import('@/lib/whatsapp');

      const values = Object.values(WHATSAPP_TEMPLATES);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
