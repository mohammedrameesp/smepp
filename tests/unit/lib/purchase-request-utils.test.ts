/**
 * Tests for Purchase Request Utilities
 * @see src/lib/purchase-request-utils.ts
 */

import {
  PURCHASE_REQUEST_CATEGORIES,
  PURCHASE_TYPES,
  COST_TYPES,
  PAYMENT_MODES,
  BILLING_CYCLES,
  CURRENCIES,
  getPurchaseTypeLabel,
  getCostTypeLabel,
  getPaymentModeLabel,
  getBillingCycleLabel,
  getStatusLabel,
  getPriorityLabel,
  getStatusColor,
  getPriorityColor,
  canEditRequest,
  canDeleteRequest,
  getAllowedStatusTransitions,
} from '@/features/purchase-requests/lib/purchase-request-utils';

describe('Purchase Request Utilities', () => {
  // ===== Constants =====
  describe('Constants', () => {
    describe('PURCHASE_REQUEST_CATEGORIES', () => {
      it('should have expected categories', () => {
        // Updated to match unified procurement categories
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('IT Equipment');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Office Supplies');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Software & Licenses');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Furniture');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Marketing & Advertising');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Travel & Transportation');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Consulting');
        expect(PURCHASE_REQUEST_CATEGORIES).toContain('Other');
      });

      it('should have 8 categories', () => {
        expect(PURCHASE_REQUEST_CATEGORIES).toHaveLength(8);
      });
    });

    describe('PURCHASE_TYPES', () => {
      it('should have expected purchase types', () => {
        const values = PURCHASE_TYPES.map(t => t.value);
        expect(values).toContain('HARDWARE');
        expect(values).toContain('SOFTWARE_SUBSCRIPTION');
        expect(values).toContain('EQUIPMENT');
        expect(values).toContain('FURNITURE');
        expect(values).toContain('OFFICE_SUPPLIES');
        expect(values).toContain('INVENTORY');
        expect(values).toContain('SERVICES');
        expect(values).toContain('MAINTENANCE');
        expect(values).toContain('UTILITIES');
        expect(values).toContain('MARKETING');
        expect(values).toContain('TRAVEL');
        expect(values).toContain('TRAINING');
        expect(values).toContain('OTHER');
      });

      it('should have 13 purchase types', () => {
        expect(PURCHASE_TYPES).toHaveLength(13);
      });

      it('should have value and label for each type', () => {
        PURCHASE_TYPES.forEach(type => {
          expect(type).toHaveProperty('value');
          expect(type).toHaveProperty('label');
          expect(typeof type.value).toBe('string');
          expect(typeof type.label).toBe('string');
        });
      });
    });

    describe('COST_TYPES', () => {
      it('should have expected cost types', () => {
        const values = COST_TYPES.map(t => t.value);
        expect(values).toContain('OPERATING_COST');
        expect(values).toContain('PROJECT_COST');
      });

      it('should have 2 cost types', () => {
        expect(COST_TYPES).toHaveLength(2);
      });
    });

    describe('PAYMENT_MODES', () => {
      it('should have expected payment modes', () => {
        const values = PAYMENT_MODES.map(m => m.value);
        expect(values).toContain('BANK_TRANSFER');
        expect(values).toContain('CREDIT_CARD');
        expect(values).toContain('CASH');
        expect(values).toContain('CHEQUE');
        expect(values).toContain('INTERNAL_TRANSFER');
      });

      it('should have 5 payment modes', () => {
        expect(PAYMENT_MODES).toHaveLength(5);
      });
    });

    describe('BILLING_CYCLES', () => {
      it('should have expected billing cycles', () => {
        const values = BILLING_CYCLES.map(c => c.value);
        expect(values).toContain('ONE_TIME');
        expect(values).toContain('MONTHLY');
        expect(values).toContain('YEARLY');
      });

      it('should have 3 billing cycles', () => {
        expect(BILLING_CYCLES).toHaveLength(3);
      });
    });

    describe('CURRENCIES', () => {
      it('should have QAR and USD', () => {
        const values = CURRENCIES.map(c => c.value);
        expect(values).toContain('QAR');
        expect(values).toContain('USD');
      });

      it('should have 2 currencies', () => {
        expect(CURRENCIES).toHaveLength(2);
      });
    });
  });

  // ===== Label Functions =====
  describe('getPurchaseTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getPurchaseTypeLabel('HARDWARE')).toBe('Hardware');
      expect(getPurchaseTypeLabel('SOFTWARE_SUBSCRIPTION')).toBe('Software/Subscription');
      expect(getPurchaseTypeLabel('EQUIPMENT')).toBe('Equipment');
      expect(getPurchaseTypeLabel('FURNITURE')).toBe('Furniture');
      expect(getPurchaseTypeLabel('OFFICE_SUPPLIES')).toBe('Office Supplies');
      expect(getPurchaseTypeLabel('INVENTORY')).toBe('Inventory/Stock');
      expect(getPurchaseTypeLabel('SERVICES')).toBe('Services');
      expect(getPurchaseTypeLabel('MAINTENANCE')).toBe('Maintenance/Repairs');
      expect(getPurchaseTypeLabel('UTILITIES')).toBe('Utilities/Telecom');
      expect(getPurchaseTypeLabel('MARKETING')).toBe('Marketing');
      expect(getPurchaseTypeLabel('TRAVEL')).toBe('Travel');
      expect(getPurchaseTypeLabel('TRAINING')).toBe('Training');
      expect(getPurchaseTypeLabel('OTHER')).toBe('Other');
    });

    it('should return input for unknown type', () => {
      expect(getPurchaseTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getCostTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getCostTypeLabel('OPERATING_COST')).toBe('Operating Cost');
      expect(getCostTypeLabel('PROJECT_COST')).toBe('Project Cost');
    });

    it('should return input for unknown type', () => {
      expect(getCostTypeLabel('CAPITAL_COST')).toBe('CAPITAL_COST');
    });
  });

  describe('getPaymentModeLabel', () => {
    it('should return correct labels', () => {
      expect(getPaymentModeLabel('BANK_TRANSFER')).toBe('Bank Transfer');
      expect(getPaymentModeLabel('CREDIT_CARD')).toBe('Credit Card');
      expect(getPaymentModeLabel('CASH')).toBe('Cash');
      expect(getPaymentModeLabel('CHEQUE')).toBe('Cheque');
      expect(getPaymentModeLabel('INTERNAL_TRANSFER')).toBe('Internal Transfer');
    });

    it('should return input for unknown mode', () => {
      expect(getPaymentModeLabel('CRYPTO')).toBe('CRYPTO');
    });
  });

  describe('getBillingCycleLabel', () => {
    it('should return correct labels', () => {
      expect(getBillingCycleLabel('ONE_TIME')).toBe('One-time');
      expect(getBillingCycleLabel('MONTHLY')).toBe('Monthly');
      expect(getBillingCycleLabel('YEARLY')).toBe('Yearly');
    });

    it('should return input for unknown cycle', () => {
      expect(getBillingCycleLabel('WEEKLY')).toBe('WEEKLY');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getStatusLabel('PENDING')).toBe('Pending');
      expect(getStatusLabel('UNDER_REVIEW')).toBe('Under Review');
      expect(getStatusLabel('APPROVED')).toBe('Approved');
      expect(getStatusLabel('REJECTED')).toBe('Rejected');
      expect(getStatusLabel('COMPLETED')).toBe('Completed');
    });

    it('should return input for unknown status', () => {
      expect(getStatusLabel('CANCELLED')).toBe('CANCELLED');
    });
  });

  describe('getPriorityLabel', () => {
    it('should return correct labels', () => {
      expect(getPriorityLabel('LOW')).toBe('Low');
      expect(getPriorityLabel('MEDIUM')).toBe('Medium');
      expect(getPriorityLabel('HIGH')).toBe('High');
      expect(getPriorityLabel('URGENT')).toBe('Urgent');
    });

    it('should return input for unknown priority', () => {
      expect(getPriorityLabel('CRITICAL')).toBe('CRITICAL');
    });
  });

  // ===== Color Functions =====
  describe('getStatusColor', () => {
    it('should return correct colors', () => {
      expect(getStatusColor('PENDING')).toBe('bg-yellow-100 text-yellow-800');
      expect(getStatusColor('UNDER_REVIEW')).toBe('bg-blue-100 text-blue-800');
      expect(getStatusColor('APPROVED')).toBe('bg-green-100 text-green-800');
      expect(getStatusColor('REJECTED')).toBe('bg-red-100 text-red-800');
      expect(getStatusColor('COMPLETED')).toBe('bg-gray-100 text-gray-800');
    });

    it('should return default gray for unknown status', () => {
      expect(getStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors', () => {
      expect(getPriorityColor('LOW')).toBe('bg-gray-100 text-gray-700');
      expect(getPriorityColor('MEDIUM')).toBe('bg-blue-100 text-blue-700');
      expect(getPriorityColor('HIGH')).toBe('bg-orange-100 text-orange-700');
      expect(getPriorityColor('URGENT')).toBe('bg-red-100 text-red-700');
    });

    it('should return default gray for unknown priority', () => {
      expect(getPriorityColor('CRITICAL')).toBe('bg-gray-100 text-gray-700');
    });
  });

  // ===== Permission Functions =====
  describe('canEditRequest', () => {
    it('should return true for PENDING status', () => {
      expect(canEditRequest('PENDING')).toBe(true);
    });

    it('should return false for non-PENDING statuses', () => {
      expect(canEditRequest('UNDER_REVIEW')).toBe(false);
      expect(canEditRequest('APPROVED')).toBe(false);
      expect(canEditRequest('REJECTED')).toBe(false);
      expect(canEditRequest('COMPLETED')).toBe(false);
    });
  });

  describe('canDeleteRequest', () => {
    it('should return true for PENDING status', () => {
      expect(canDeleteRequest('PENDING')).toBe(true);
    });

    it('should return false for non-PENDING statuses', () => {
      expect(canDeleteRequest('UNDER_REVIEW')).toBe(false);
      expect(canDeleteRequest('APPROVED')).toBe(false);
      expect(canDeleteRequest('REJECTED')).toBe(false);
      expect(canDeleteRequest('COMPLETED')).toBe(false);
    });
  });

  // ===== Status Transitions =====
  describe('getAllowedStatusTransitions', () => {
    it('should return correct transitions for PENDING', () => {
      const transitions = getAllowedStatusTransitions('PENDING');
      expect(transitions).toContain('UNDER_REVIEW');
      expect(transitions).toContain('APPROVED');
      expect(transitions).toContain('REJECTED');
      expect(transitions).not.toContain('COMPLETED');
      expect(transitions).not.toContain('PENDING');
    });

    it('should return correct transitions for UNDER_REVIEW', () => {
      const transitions = getAllowedStatusTransitions('UNDER_REVIEW');
      expect(transitions).toContain('APPROVED');
      expect(transitions).toContain('REJECTED');
      expect(transitions).toContain('PENDING');
      expect(transitions).not.toContain('COMPLETED');
    });

    it('should return correct transitions for APPROVED', () => {
      const transitions = getAllowedStatusTransitions('APPROVED');
      expect(transitions).toContain('COMPLETED');
      expect(transitions).toContain('REJECTED');
      expect(transitions).not.toContain('PENDING');
      expect(transitions).not.toContain('UNDER_REVIEW');
    });

    it('should return correct transitions for REJECTED', () => {
      const transitions = getAllowedStatusTransitions('REJECTED');
      expect(transitions).toContain('PENDING');
      expect(transitions).toContain('UNDER_REVIEW');
      expect(transitions).not.toContain('APPROVED');
      expect(transitions).not.toContain('COMPLETED');
    });

    it('should return empty array for COMPLETED (terminal state)', () => {
      const transitions = getAllowedStatusTransitions('COMPLETED');
      expect(transitions).toHaveLength(0);
    });

    it('should return empty array for unknown status', () => {
      const transitions = getAllowedStatusTransitions('UNKNOWN');
      expect(transitions).toHaveLength(0);
    });
  });
});
