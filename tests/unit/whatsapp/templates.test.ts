/**
 * @file templates.test.ts
 * @description Unit tests for WhatsApp message templates
 */

// Mock datetime module
jest.mock('@/lib/core/datetime', () => ({
  formatDate: (date: Date) => {
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  },
}));

describe('WhatsApp Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildLeaveApprovalTemplate', () => {
    it('should generate correct leave template structure', async () => {
      const { buildLeaveApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildLeaveApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'John Doe',
          leaveType: 'Annual Leave',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-17'),
          totalDays: 3,
          reason: 'Family vacation',
        },
        'approve-token-123',
        'reject-token-456'
      );

      expect(result.to).toBe('+97455123456');
      expect(result.templateName).toBe('leave_approval_request');
      expect(result.languageCode).toBe('en');
      expect(result.components).toHaveLength(3); // body + 2 buttons
    });

    it('should include body parameters in correct order', async () => {
      const { buildLeaveApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildLeaveApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Jane Smith',
          leaveType: 'Sick Leave',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-03'),
          totalDays: 3,
          reason: 'Medical appointment',
        },
        'approve-token',
        'reject-token'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters).toHaveLength(4);
      expect(bodyComponent?.parameters?.[0].text).toBe('Jane Smith'); // requesterName
      expect(bodyComponent?.parameters?.[1].text).toBe('Sick Leave'); // leaveType
      expect(bodyComponent?.parameters?.[2].text).toContain('Feb'); // date range
      expect(bodyComponent?.parameters?.[3].text).toBe('Medical appointment'); // reason
    });

    it('should include approve and reject button tokens', async () => {
      const { buildLeaveApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildLeaveApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          leaveType: 'Annual',
          startDate: new Date(),
          endDate: new Date(),
        },
        'my-approve-token',
        'my-reject-token'
      );

      const buttons = result.components.filter((c) => c.type === 'button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].parameters?.[0].payload).toBe('my-approve-token');
      expect(buttons[1].parameters?.[0].payload).toBe('my-reject-token');
    });

    it('should handle missing reason with default', async () => {
      const { buildLeaveApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildLeaveApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          leaveType: 'Annual',
          startDate: new Date(),
          endDate: new Date(),
          // No reason provided
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[3].text).toBe('No reason provided');
    });

    it('should handle missing dates with N/A', async () => {
      const { buildLeaveApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildLeaveApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          // No dates provided
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toBe('N/A');
    });
  });

  describe('buildPurchaseApprovalTemplate', () => {
    it('should generate correct spend request template structure', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'John Doe',
          title: 'Office Equipment',
          totalAmount: 5000,
          currency: 'QAR',
        },
        'approve-token',
        'reject-token'
      );

      expect(result.to).toBe('+97455123456');
      expect(result.templateName).toBe('purchase_approval_request');
      expect(result.languageCode).toBe('en');
    });

    it('should format amount with currency', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          title: 'Supplies',
          totalAmount: 1500.5,
          currency: 'QAR',
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      // Amount should be formatted as currency
      expect(bodyComponent?.parameters?.[2].text).toContain('QAR');
      expect(bodyComponent?.parameters?.[2].text).toContain('1,500');
    });

    it('should use QAR as default currency', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          title: 'Items',
          totalAmount: 100,
          // No currency specified
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toContain('QAR');
    });

    it('should handle missing title with default', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          totalAmount: 100,
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[1].text).toBe('Spend Request');
    });
  });

  describe('buildAssetApprovalTemplate', () => {
    it('should generate correct asset request template structure', async () => {
      const { buildAssetApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildAssetApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Jane Doe',
          assetName: 'MacBook Pro 16"',
          assetType: 'Laptop',
          justification: 'For development work',
        },
        'approve-token',
        'reject-token'
      );

      expect(result.to).toBe('+97455123456');
      expect(result.templateName).toBe('asset_approval_request');
      expect(result.languageCode).toBe('en');
    });

    it('should combine asset type and name', async () => {
      const { buildAssetApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildAssetApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          assetName: 'Dell Monitor',
          assetType: 'Display',
          justification: 'Needed for work',
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[1].text).toContain('Display');
      expect(bodyComponent?.parameters?.[1].text).toContain('Dell Monitor');
    });

    it('should handle missing justification with default', async () => {
      const { buildAssetApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildAssetApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test User',
          assetName: 'Keyboard',
        },
        'approve',
        'reject'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toBe('No justification provided');
    });
  });

  describe('buildApprovalTemplate', () => {
    it('should route to leave template for LEAVE_REQUEST', async () => {
      const { buildApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildApprovalTemplate(
        '+97455123456',
        'LEAVE_REQUEST',
        { requesterName: 'Test', leaveType: 'Annual', startDate: new Date(), endDate: new Date() },
        'approve',
        'reject'
      );

      expect(result.templateName).toBe('leave_approval_request');
    });

    it('should route to purchase template for SPEND_REQUEST', async () => {
      const { buildApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildApprovalTemplate(
        '+97455123456',
        'SPEND_REQUEST',
        { requesterName: 'Test', title: 'Supplies', totalAmount: 100 },
        'approve',
        'reject'
      );

      expect(result.templateName).toBe('purchase_approval_request');
    });

    it('should route to asset template for ASSET_REQUEST', async () => {
      const { buildApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildApprovalTemplate(
        '+97455123456',
        'ASSET_REQUEST',
        { requesterName: 'Test', assetName: 'Laptop' },
        'approve',
        'reject'
      );

      expect(result.templateName).toBe('asset_approval_request');
    });

    it('should throw for unknown entity type', async () => {
      const { buildApprovalTemplate } = await import('@/lib/whatsapp/templates');

      expect(() =>
        buildApprovalTemplate(
          '+97455123456',
          'UNKNOWN_TYPE' as any,
          { requesterName: 'Test' },
          'approve',
          'reject'
        )
      ).toThrow('Unknown entity type');
    });
  });

  describe('buildActionConfirmationText', () => {
    it('should generate approve confirmation text', async () => {
      const { buildActionConfirmationText } = await import('@/lib/whatsapp/templates');

      const result = buildActionConfirmationText('approve', 'LEAVE_REQUEST', {
        requesterName: 'John Doe',
      });

      expect(result).toContain('approved');
      expect(result).toContain('leave request');
      expect(result).toContain('John Doe');
    });

    it('should generate reject confirmation text', async () => {
      const { buildActionConfirmationText } = await import('@/lib/whatsapp/templates');

      const result = buildActionConfirmationText('reject', 'SPEND_REQUEST', {
        requesterName: 'Jane Smith',
        title: 'Office Supplies',
      });

      expect(result).toContain('rejected');
      expect(result).toContain('spend request');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Office Supplies');
    });

    it('should include title when provided', async () => {
      const { buildActionConfirmationText } = await import('@/lib/whatsapp/templates');

      const result = buildActionConfirmationText('approve', 'SPEND_REQUEST', {
        requesterName: 'Test User',
        title: 'Equipment Purchase',
      });

      expect(result).toContain('"Equipment Purchase"');
    });

    it('should work without title', async () => {
      const { buildActionConfirmationText } = await import('@/lib/whatsapp/templates');

      const result = buildActionConfirmationText('approve', 'ASSET_REQUEST', {
        requesterName: 'Test User',
      });

      expect(result).toContain('approved');
      expect(result).toContain('asset request');
      expect(result).not.toContain('undefined');
    });

    it('should handle all entity types', async () => {
      const { buildActionConfirmationText } = await import('@/lib/whatsapp/templates');

      const leaveResult = buildActionConfirmationText('approve', 'LEAVE_REQUEST', {
        requesterName: 'Test',
      });
      const spendResult = buildActionConfirmationText('approve', 'SPEND_REQUEST', {
        requesterName: 'Test',
      });
      const assetResult = buildActionConfirmationText('approve', 'ASSET_REQUEST', {
        requesterName: 'Test',
      });

      expect(leaveResult).toContain('leave request');
      expect(spendResult).toContain('spend request');
      expect(assetResult).toContain('asset request');
    });
  });

  describe('formatAmount', () => {
    // formatAmount is private, but we test it through buildPurchaseApprovalTemplate
    it('should format large amounts with commas', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test',
          totalAmount: 1234567.89,
          currency: 'QAR',
        },
        'a',
        'r'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toContain('1,234,567');
    });

    it('should handle zero amount', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test',
          totalAmount: 0,
          currency: 'QAR',
        },
        'a',
        'r'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toContain('0');
    });

    it('should handle different currencies', async () => {
      const { buildPurchaseApprovalTemplate } = await import('@/lib/whatsapp/templates');

      const result = buildPurchaseApprovalTemplate(
        '+97455123456',
        {
          requesterName: 'Test',
          totalAmount: 100,
          currency: 'USD',
        },
        'a',
        'r'
      );

      const bodyComponent = result.components.find((c) => c.type === 'body');
      expect(bodyComponent?.parameters?.[2].text).toContain('$');
    });
  });
});
