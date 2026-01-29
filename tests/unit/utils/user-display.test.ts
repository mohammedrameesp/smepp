/**
 * @file user-display.test.ts
 * @description Unit tests for user display utilities
 */

import {
  isInternalEmail,
  getDisplayEmail,
  getDisplayName,
  getDisplayInitials,
} from '@/lib/utils/user-display';

describe('User Display Utilities', () => {
  describe('isInternalEmail', () => {
    describe('with .internal suffix', () => {
      it('should return true for emails ending with .internal', () => {
        expect(isInternalEmail('nologin-abc123@acme.internal')).toBe(true);
        expect(isInternalEmail('user@org.internal')).toBe(true);
        expect(isInternalEmail('test@system.internal')).toBe(true);
      });

      it('should be case-sensitive (only lowercase .internal suffix)', () => {
        // The implementation uses endsWith() which is case-sensitive
        expect(isInternalEmail('user@ORG.INTERNAL')).toBe(false);
        expect(isInternalEmail('user@org.Internal')).toBe(false);
        // Only lowercase suffix matches
        expect(isInternalEmail('user@ORG.internal')).toBe(true);
      });

      it('should match the exact suffix', () => {
        expect(isInternalEmail('nologin-xyz@company.internal')).toBe(true);
        expect(isInternalEmail('system@internal.internal')).toBe(true);
      });
    });

    describe('with regular emails', () => {
      it('should return false for regular email addresses', () => {
        expect(isInternalEmail('john@company.com')).toBe(false);
        expect(isInternalEmail('jane.doe@organization.org')).toBe(false);
        expect(isInternalEmail('user@email.co.uk')).toBe(false);
      });

      it('should return false for emails containing "internal" but not as suffix', () => {
        expect(isInternalEmail('internal@company.com')).toBe(false);
        expect(isInternalEmail('internal.user@company.com')).toBe(false);
        expect(isInternalEmail('user@internal.company.com')).toBe(false);
      });

      it('should return false for similar but different suffixes', () => {
        expect(isInternalEmail('user@company.internals')).toBe(false);
        expect(isInternalEmail('user@company.internal.com')).toBe(false);
      });
    });

    describe('with null/undefined', () => {
      it('should return false for null', () => {
        expect(isInternalEmail(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isInternalEmail(undefined)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isInternalEmail('')).toBe(false);
      });
    });
  });

  describe('getDisplayEmail', () => {
    describe('filtering', () => {
      it('should return the email for regular addresses', () => {
        expect(getDisplayEmail('john@company.com')).toBe('john@company.com');
        expect(getDisplayEmail('jane.doe@org.net')).toBe('jane.doe@org.net');
      });

      it('should return undefined for internal emails', () => {
        expect(getDisplayEmail('nologin-abc@acme.internal')).toBeUndefined();
        expect(getDisplayEmail('user@system.internal')).toBeUndefined();
      });

      it('should return undefined for null', () => {
        expect(getDisplayEmail(null)).toBeUndefined();
      });

      it('should return undefined for undefined', () => {
        expect(getDisplayEmail(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(getDisplayEmail('')).toBeUndefined();
      });
    });
  });

  describe('getDisplayName', () => {
    describe('fallback chain', () => {
      it('should return name when name is available', () => {
        expect(getDisplayName('John Doe', 'john@company.com')).toBe('John Doe');
        expect(getDisplayName('Jane Smith', null)).toBe('Jane Smith');
        expect(getDisplayName('Bob', undefined)).toBe('Bob');
      });

      it('should return email when name is null and email is regular', () => {
        expect(getDisplayName(null, 'john@company.com')).toBe('john@company.com');
        expect(getDisplayName(undefined, 'jane@org.net')).toBe('jane@org.net');
      });

      it('should return fallback when name is null and email is internal', () => {
        expect(getDisplayName(null, 'nologin-abc@acme.internal')).toBe('Unnamed');
        expect(getDisplayName(undefined, 'user@system.internal')).toBe('Unnamed');
      });

      it('should return fallback when both name and email are null', () => {
        expect(getDisplayName(null, null)).toBe('Unnamed');
        expect(getDisplayName(undefined, undefined)).toBe('Unnamed');
        expect(getDisplayName(null)).toBe('Unnamed');
      });

      it('should use custom fallback when provided', () => {
        expect(getDisplayName(null, null, 'Unknown User')).toBe('Unknown User');
        expect(getDisplayName(null, 'user@system.internal', 'Anonymous')).toBe('Anonymous');
      });

      it('should return name even if it is an empty-looking string', () => {
        // This tests truthy check - empty string is falsy
        expect(getDisplayName('', 'john@company.com')).toBe('john@company.com');
      });
    });

    describe('edge cases', () => {
      it('should handle whitespace-only name as valid name', () => {
        // Whitespace is truthy, so it's returned as-is
        expect(getDisplayName('   ', 'john@company.com')).toBe('   ');
      });

      it('should not use email when it is empty string', () => {
        expect(getDisplayName(null, '')).toBe('Unnamed');
      });
    });
  });

  describe('getDisplayInitials', () => {
    describe('extraction', () => {
      it('should extract first letter of name', () => {
        expect(getDisplayInitials('John Doe', 'john@company.com')).toBe('J');
        expect(getDisplayInitials('Jane', null)).toBe('J');
        expect(getDisplayInitials('bob smith', undefined)).toBe('B');
      });

      it('should use email initial when name is null and email is regular', () => {
        expect(getDisplayInitials(null, 'john@company.com')).toBe('J');
        expect(getDisplayInitials(undefined, 'alice@org.net')).toBe('A');
      });

      it('should return "?" when name is null and email is internal', () => {
        expect(getDisplayInitials(null, 'nologin-abc@acme.internal')).toBe('?');
        expect(getDisplayInitials(undefined, 'user@system.internal')).toBe('?');
      });

      it('should return "?" when both name and email are null', () => {
        expect(getDisplayInitials(null, null)).toBe('?');
        expect(getDisplayInitials(undefined, undefined)).toBe('?');
        expect(getDisplayInitials(null)).toBe('?');
      });

      it('should uppercase the initial', () => {
        expect(getDisplayInitials('john', 'john@company.com')).toBe('J');
        expect(getDisplayInitials(null, 'alice@org.net')).toBe('A');
      });

      it('should handle names starting with special characters', () => {
        // First character is returned and uppercased
        expect(getDisplayInitials('123 Company', null)).toBe('1');
        expect(getDisplayInitials('@special', null)).toBe('@');
      });
    });

    describe('edge cases', () => {
      it('should handle single character names', () => {
        expect(getDisplayInitials('X', null)).toBe('X');
        expect(getDisplayInitials('a', null)).toBe('A');
      });

      it('should handle email with number as first character', () => {
        expect(getDisplayInitials(null, '123@company.com')).toBe('1');
      });
    });
  });
});
