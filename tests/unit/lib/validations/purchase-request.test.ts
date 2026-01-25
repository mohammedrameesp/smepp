/**
 * Tests for Spend Request Validation Schemas
 * @see src/lib/validations/projects/spend-request.ts
 */

import {
  purchaseTypeEnum,
  costTypeEnum,
  paymentModeEnum,
  billingCycleEnum,
  spendRequestItemSchema,
  createSpendRequestSchema,
  updateSpendRequestSchema,
  updateSpendRequestStatusSchema,
  updateSpendRequestItemSchema,
} from '@/lib/validations/projects/spend-request';

describe('Purchase Request Validation Schemas', () => {
  // ===== Enum Schemas =====
  describe('purchaseTypeEnum', () => {
    it('should accept all valid purchase types', () => {
      const validTypes = [
        'HARDWARE',
        'SOFTWARE_SUBSCRIPTION',
        'SERVICES',
        'OFFICE_SUPPLIES',
        'MARKETING',
        'TRAVEL',
        'TRAINING',
        'OTHER'
      ];
      validTypes.forEach(type => {
        const result = purchaseTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid purchase type', () => {
      const result = purchaseTypeEnum.safeParse('INVALID_TYPE');
      expect(result.success).toBe(false);
    });
  });

  describe('costTypeEnum', () => {
    it('should accept OPERATING_COST and PROJECT_COST', () => {
      expect(costTypeEnum.safeParse('OPERATING_COST').success).toBe(true);
      expect(costTypeEnum.safeParse('PROJECT_COST').success).toBe(true);
    });

    it('should reject invalid cost type', () => {
      const result = costTypeEnum.safeParse('CAPITAL_COST');
      expect(result.success).toBe(false);
    });
  });

  describe('paymentModeEnum', () => {
    it('should accept all valid payment modes', () => {
      const validModes = [
        'BANK_TRANSFER',
        'CREDIT_CARD',
        'CASH',
        'CHEQUE',
        'INTERNAL_TRANSFER'
      ];
      validModes.forEach(mode => {
        const result = paymentModeEnum.safeParse(mode);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid payment mode', () => {
      const result = paymentModeEnum.safeParse('CRYPTO');
      expect(result.success).toBe(false);
    });
  });

  describe('billingCycleEnum', () => {
    it('should accept all valid billing cycles', () => {
      expect(billingCycleEnum.safeParse('ONE_TIME').success).toBe(true);
      expect(billingCycleEnum.safeParse('MONTHLY').success).toBe(true);
      expect(billingCycleEnum.safeParse('YEARLY').success).toBe(true);
    });

    it('should reject invalid billing cycle', () => {
      const result = billingCycleEnum.safeParse('WEEKLY');
      expect(result.success).toBe(false);
    });
  });

  // ===== Item Schema =====
  describe('spendRequestItemSchema', () => {
    it('should validate a complete item', () => {
      const validItem = {
        description: 'MacBook Pro 16"',
        quantity: 2,
        unitPrice: 2500,
        currency: 'USD',
        category: 'IT Equipment',
        supplier: 'Apple Store',
        notes: 'For development team',
        billingCycle: 'ONE_TIME',
        durationMonths: null,
        amountPerCycle: null,
        productUrl: 'https://apple.com/macbook-pro',
      };
      const result = spendRequestItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should validate minimal item', () => {
      const minimalItem = {
        description: 'Office Supplies',
        quantity: 1,
        unitPrice: 50,
      };
      const result = spendRequestItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('QAR');
        expect(result.data.billingCycle).toBe('ONE_TIME');
      }
    });

    it('should fail when description is missing', () => {
      const result = spendRequestItemSchema.safeParse({
        quantity: 1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when description is empty', () => {
      const result = spendRequestItemSchema.safeParse({
        description: '',
        quantity: 1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when description exceeds 500 characters', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'a'.repeat(501),
        quantity: 1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when quantity is less than 1', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: 0,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when quantity is negative', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: -1,
        unitPrice: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should fail when unitPrice is negative', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: 1,
        unitPrice: -50,
      });
      expect(result.success).toBe(false);
    });

    it('should accept zero unitPrice', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Free Sample',
        quantity: 1,
        unitPrice: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should validate recurring item', () => {
      const recurringItem = {
        description: 'Software License',
        quantity: 10,
        unitPrice: 15,
        billingCycle: 'MONTHLY',
        durationMonths: 12,
        amountPerCycle: 150,
      };
      const result = spendRequestItemSchema.safeParse(recurringItem);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid product URL', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        productUrl: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty string for product URL', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        productUrl: '',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid product URL', () => {
      const result = spendRequestItemSchema.safeParse({
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        productUrl: 'https://example.com/product',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===== Create Purchase Request Schema =====
  describe('createSpendRequestSchema', () => {
    const validRequest = {
      title: 'IT Equipment Request',
      description: 'Laptops for new employees',
      justification: 'New hires starting next month',
      priority: 'HIGH',
      neededByDate: '2025-02-01',
      purchaseType: 'HARDWARE',
      costType: 'OPERATING_COST',
      paymentMode: 'BANK_TRANSFER',
      currency: 'QAR',
      vendorName: 'Tech Store',
      vendorContact: '+974 1234 5678',
      vendorEmail: 'sales@techstore.com',
      items: [
        {
          description: 'MacBook Pro',
          quantity: 2,
          unitPrice: 9000,
        },
      ],
    };

    it('should validate a complete purchase request', () => {
      const result = createSpendRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate minimal purchase request', () => {
      const minimalRequest = {
        title: 'Office Supplies',
        items: [
          {
            description: 'Pens and paper',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };
      const result = createSpendRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('MEDIUM');
        expect(result.data.purchaseType).toBe('OTHER');
        expect(result.data.costType).toBe('OPERATING_COST');
        expect(result.data.paymentMode).toBe('BANK_TRANSFER');
        expect(result.data.currency).toBe('QAR');
      }
    });

    it('should fail when title is missing', () => {
      const { title: _title, ...withoutTitle } = validRequest;
      const result = createSpendRequestSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });

    it('should fail when title is empty', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        title: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail when title exceeds 200 characters', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should fail when items array is empty', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('should fail when items is missing', () => {
      const { items: _items, ...withoutItems } = validRequest;
      const result = createSpendRequestSchema.safeParse(withoutItems);
      expect(result.success).toBe(false);
    });

    it('should validate all priority levels', () => {
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      priorities.forEach(priority => {
        const result = createSpendRequestSchema.safeParse({
          ...validRequest,
          priority,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid priority', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        priority: 'CRITICAL',
      });
      expect(result.success).toBe(false);
    });

    it('should require projectName when costType is PROJECT_COST', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        costType: 'PROJECT_COST',
        projectName: '', // Empty project name
      });
      expect(result.success).toBe(false);
    });

    it('should pass when costType is PROJECT_COST with projectName', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        costType: 'PROJECT_COST',
        projectName: 'Website Redesign',
      });
      expect(result.success).toBe(true);
    });

    it('should not require projectName when costType is OPERATING_COST', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        costType: 'OPERATING_COST',
        projectName: null,
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid vendor email', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        vendorEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty string for vendor email', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        vendorEmail: '',
      });
      expect(result.success).toBe(true);
    });

    it('should validate multiple items', () => {
      const result = createSpendRequestSchema.safeParse({
        ...validRequest,
        items: [
          { description: 'Item 1', quantity: 1, unitPrice: 100 },
          { description: 'Item 2', quantity: 2, unitPrice: 200 },
          { description: 'Item 3', quantity: 3, unitPrice: 300 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(3);
      }
    });
  });

  // ===== Update Purchase Request Schema =====
  describe('updateSpendRequestSchema', () => {
    it('should allow partial updates', () => {
      const result = updateSpendRequestSchema.safeParse({
        title: 'Updated Title',
        priority: 'URGENT',
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateSpendRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate item updates', () => {
      const result = updateSpendRequestSchema.safeParse({
        items: [
          { description: 'Updated Item', quantity: 5, unitPrice: 500 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid vendor email', () => {
      const result = updateSpendRequestSchema.safeParse({
        vendorEmail: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('should allow null values for optional fields', () => {
      const result = updateSpendRequestSchema.safeParse({
        description: null,
        justification: null,
        neededByDate: null,
        projectName: null,
        vendorName: null,
        additionalNotes: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ===== Update Status Schema =====
  describe('updateSpendRequestStatusSchema', () => {
    it('should validate all statuses', () => {
      const statuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'];
      statuses.forEach(status => {
        const result = updateSpendRequestStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid status', () => {
      const result = updateSpendRequestStatusSchema.safeParse({
        status: 'CANCELLED',
      });
      expect(result.success).toBe(false);
    });

    it('should accept reviewNotes', () => {
      const result = updateSpendRequestStatusSchema.safeParse({
        status: 'APPROVED',
        reviewNotes: 'Approved by manager',
      });
      expect(result.success).toBe(true);
    });

    it('should accept completionNotes', () => {
      const result = updateSpendRequestStatusSchema.safeParse({
        status: 'COMPLETED',
        completionNotes: 'Items received and verified',
      });
      expect(result.success).toBe(true);
    });

    it('should fail without status', () => {
      const result = updateSpendRequestStatusSchema.safeParse({
        reviewNotes: 'Some notes',
      });
      expect(result.success).toBe(false);
    });
  });

  // ===== Update Item Schema =====
  describe('updateSpendRequestItemSchema', () => {
    it('should allow partial item updates', () => {
      const result = updateSpendRequestItemSchema.safeParse({
        quantity: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateSpendRequestItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate updated billing cycle', () => {
      const result = updateSpendRequestItemSchema.safeParse({
        billingCycle: 'MONTHLY',
        durationMonths: 12,
        amountPerCycle: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid URL', () => {
      const result = updateSpendRequestItemSchema.safeParse({
        productUrl: 'invalid-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept empty productUrl', () => {
      const result = updateSpendRequestItemSchema.safeParse({
        productUrl: '',
      });
      expect(result.success).toBe(true);
    });
  });
});
