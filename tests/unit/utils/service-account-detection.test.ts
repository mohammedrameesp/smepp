/**
 * @file service-account-detection.test.ts
 * @description Unit tests for service account detection utility
 */

import { isLikelyServiceAccount } from '@/lib/utils/service-account-detection';

describe('Service Account Detection', () => {
  describe('isLikelyServiceAccount', () => {
    describe('with exact pattern match', () => {
      it('should detect common service account patterns', () => {
        expect(isLikelyServiceAccount('info@company.com')).toBe(true);
        expect(isLikelyServiceAccount('support@company.com')).toBe(true);
        expect(isLikelyServiceAccount('admin@company.com')).toBe(true);
        expect(isLikelyServiceAccount('sales@company.com')).toBe(true);
        expect(isLikelyServiceAccount('hr@company.com')).toBe(true);
        expect(isLikelyServiceAccount('hello@company.com')).toBe(true);
        expect(isLikelyServiceAccount('contact@company.com')).toBe(true);
      });

      it('should detect no-reply patterns', () => {
        expect(isLikelyServiceAccount('noreply@company.com')).toBe(true);
        expect(isLikelyServiceAccount('no-reply@company.com')).toBe(true);
        expect(isLikelyServiceAccount('donotreply@company.com')).toBe(true);
        expect(isLikelyServiceAccount('do-not-reply@company.com')).toBe(true);
      });

      it('should detect department patterns', () => {
        expect(isLikelyServiceAccount('billing@company.com')).toBe(true);
        expect(isLikelyServiceAccount('accounts@company.com')).toBe(true);
        expect(isLikelyServiceAccount('finance@company.com')).toBe(true);
        expect(isLikelyServiceAccount('marketing@company.com')).toBe(true);
        expect(isLikelyServiceAccount('operations@company.com')).toBe(true);
        expect(isLikelyServiceAccount('legal@company.com')).toBe(true);
        expect(isLikelyServiceAccount('compliance@company.com')).toBe(true);
      });

      it('should detect technical patterns', () => {
        expect(isLikelyServiceAccount('it@company.com')).toBe(true);
        expect(isLikelyServiceAccount('tech@company.com')).toBe(true);
        expect(isLikelyServiceAccount('webmaster@company.com')).toBe(true);
        expect(isLikelyServiceAccount('postmaster@company.com')).toBe(true);
        expect(isLikelyServiceAccount('abuse@company.com')).toBe(true);
        expect(isLikelyServiceAccount('security@company.com')).toBe(true);
      });

      it('should detect customer service patterns', () => {
        expect(isLikelyServiceAccount('customerservice@company.com')).toBe(true);
        expect(isLikelyServiceAccount('customer-service@company.com')).toBe(true);
        expect(isLikelyServiceAccount('customersupport@company.com')).toBe(true);
        expect(isLikelyServiceAccount('customer-support@company.com')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(isLikelyServiceAccount('INFO@company.com')).toBe(true);
        expect(isLikelyServiceAccount('Info@company.com')).toBe(true);
        expect(isLikelyServiceAccount('SUPPORT@company.com')).toBe(true);
      });
    });

    describe('with pattern at start (info.sales@)', () => {
      it('should detect pattern with dot separator', () => {
        expect(isLikelyServiceAccount('info.sales@company.com')).toBe(true);
        expect(isLikelyServiceAccount('support.qatar@company.com')).toBe(true);
        expect(isLikelyServiceAccount('admin.team@company.com')).toBe(true);
      });

      it('should detect pattern with underscore separator', () => {
        expect(isLikelyServiceAccount('info_sales@company.com')).toBe(true);
        expect(isLikelyServiceAccount('support_team@company.com')).toBe(true);
        expect(isLikelyServiceAccount('admin_dept@company.com')).toBe(true);
      });

      it('should detect pattern with hyphen separator', () => {
        expect(isLikelyServiceAccount('info-sales@company.com')).toBe(true);
        expect(isLikelyServiceAccount('support-qatar@company.com')).toBe(true);
        expect(isLikelyServiceAccount('admin-team@company.com')).toBe(true);
      });
    });

    describe('with pattern at end (sales.info@)', () => {
      it('should detect pattern with dot separator at end', () => {
        expect(isLikelyServiceAccount('sales.info@company.com')).toBe(true);
        expect(isLikelyServiceAccount('qatar.support@company.com')).toBe(true);
        expect(isLikelyServiceAccount('team.admin@company.com')).toBe(true);
      });

      it('should detect pattern with underscore separator at end', () => {
        expect(isLikelyServiceAccount('sales_info@company.com')).toBe(true);
        expect(isLikelyServiceAccount('team_support@company.com')).toBe(true);
        expect(isLikelyServiceAccount('dept_admin@company.com')).toBe(true);
      });

      it('should detect pattern with hyphen separator at end', () => {
        expect(isLikelyServiceAccount('sales-info@company.com')).toBe(true);
        expect(isLikelyServiceAccount('qatar-support@company.com')).toBe(true);
        expect(isLikelyServiceAccount('team-admin@company.com')).toBe(true);
      });
    });

    describe('with personal emails (john@, jane.doe@)', () => {
      it('should not flag simple personal emails', () => {
        expect(isLikelyServiceAccount('john@company.com')).toBe(false);
        expect(isLikelyServiceAccount('jane@company.com')).toBe(false);
        expect(isLikelyServiceAccount('bob@company.com')).toBe(false);
        expect(isLikelyServiceAccount('alice@company.com')).toBe(false);
      });

      it('should not flag personal emails with dots', () => {
        expect(isLikelyServiceAccount('john.doe@company.com')).toBe(false);
        expect(isLikelyServiceAccount('jane.smith@company.com')).toBe(false);
        expect(isLikelyServiceAccount('first.last@company.com')).toBe(false);
      });

      it('should not flag personal emails with underscores', () => {
        expect(isLikelyServiceAccount('john_doe@company.com')).toBe(false);
        expect(isLikelyServiceAccount('jane_smith@company.com')).toBe(false);
      });

      it('should not flag personal emails with numbers', () => {
        expect(isLikelyServiceAccount('john123@company.com')).toBe(false);
        expect(isLikelyServiceAccount('user42@company.com')).toBe(false);
      });

      it('should not flag initials-based emails', () => {
        expect(isLikelyServiceAccount('jd@company.com')).toBe(false);
        expect(isLikelyServiceAccount('j.doe@company.com')).toBe(false);
      });
    });

    describe('with null/undefined/empty input', () => {
      it('should return false for null', () => {
        expect(isLikelyServiceAccount(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isLikelyServiceAccount(undefined as unknown as string)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isLikelyServiceAccount('')).toBe(false);
      });

      it('should return false for whitespace-only', () => {
        expect(isLikelyServiceAccount('   ')).toBe(false);
      });

      it('should return false for non-string types', () => {
        expect(isLikelyServiceAccount(123 as unknown as string)).toBe(false);
        expect(isLikelyServiceAccount({} as unknown as string)).toBe(false);
        expect(isLikelyServiceAccount([] as unknown as string)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should not flag emails with pattern in domain', () => {
        expect(isLikelyServiceAccount('john@info.company.com')).toBe(false);
        expect(isLikelyServiceAccount('jane@support.company.com')).toBe(false);
      });

      it('should handle emails without @ symbol', () => {
        expect(isLikelyServiceAccount('notanemail')).toBe(false);
        expect(isLikelyServiceAccount('info')).toBe(true); // Just the local part
      });

      it('should handle emails with whitespace around @', () => {
        // Whitespace in local part should be trimmed
        expect(isLikelyServiceAccount(' info @company.com')).toBe(true);
      });

      it('should not flag partial pattern matches in middle', () => {
        expect(isLikelyServiceAccount('johninfo@company.com')).toBe(false);
        expect(isLikelyServiceAccount('myinfobox@company.com')).toBe(false);
      });
    });
  });
});
