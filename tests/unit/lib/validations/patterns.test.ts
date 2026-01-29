/**
 * @file patterns.test.ts
 * @description Unit tests for validation regex patterns
 * @module tests/unit/lib/validations
 */

import {
  VALIDATION_PATTERNS,
  PATTERN_MESSAGES,
  matchesPattern,
  getPatternConfig,
} from '@/lib/validations/patterns';

describe('Validation Patterns', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT INFORMATION PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('email pattern', () => {
    it('should match valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'a@b.co',
      ];
      for (const email of validEmails) {
        expect(VALIDATION_PATTERNS.email.test(email)).toBe(true);
      }
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'no@domain',
        'spaces in@email.com',
        '',
      ];
      for (const email of invalidEmails) {
        expect(VALIDATION_PATTERNS.email.test(email)).toBe(false);
      }
    });
  });

  describe('domain pattern', () => {
    it('should match valid domains', () => {
      const validDomains = [
        'example.com',
        'https://example.com',
        'http://example.com',
        'sub.domain.co.uk',
        'https://example.com/path/to/page',
      ];
      for (const domain of validDomains) {
        expect(VALIDATION_PATTERNS.domain.test(domain)).toBe(true);
      }
    });

    it('should reject invalid domains', () => {
      const invalidDomains = ['notadomain', 'ftp://example.com', ''];
      for (const domain of invalidDomains) {
        expect(VALIDATION_PATTERNS.domain.test(domain)).toBe(false);
      }
    });
  });

  describe('phone pattern', () => {
    it('should match valid phone numbers (7-15 digits)', () => {
      const validPhones = ['1234567', '12345678901', '123456789012345'];
      for (const phone of validPhones) {
        expect(VALIDATION_PATTERNS.phone.test(phone)).toBe(true);
      }
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123456', '1234567890123456', '123-456-7890', ''];
      for (const phone of invalidPhones) {
        expect(VALIDATION_PATTERNS.phone.test(phone)).toBe(false);
      }
    });
  });

  describe('mobile pattern', () => {
    it('should match valid mobile numbers (5-15 digits)', () => {
      const validMobiles = ['12345', '123456789', '123456789012345'];
      for (const mobile of validMobiles) {
        expect(VALIDATION_PATTERNS.mobile.test(mobile)).toBe(true);
      }
    });

    it('should reject invalid mobile numbers', () => {
      const invalidMobiles = ['1234', '1234567890123456', '+1234567890', ''];
      for (const mobile of invalidMobiles) {
        expect(VALIDATION_PATTERNS.mobile.test(mobile)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QATAR-SPECIFIC PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('qatarId pattern', () => {
    it('should match valid Qatar IDs (11 digits)', () => {
      const validIds = ['29012345678', '12345678901', '00000000000'];
      for (const id of validIds) {
        expect(VALIDATION_PATTERNS.qatarId.test(id)).toBe(true);
      }
    });

    it('should reject invalid Qatar IDs', () => {
      const invalidIds = [
        '1234567890', // 10 digits
        '123456789012', // 12 digits
        '2901234567A', // contains letter
        '',
      ];
      for (const id of invalidIds) {
        expect(VALIDATION_PATTERNS.qatarId.test(id)).toBe(false);
      }
    });
  });

  describe('qatarMobile pattern', () => {
    it('should match valid Qatar mobile numbers (8 digits)', () => {
      const validMobiles = ['55123456', '33123456', '66123456', '77123456'];
      for (const mobile of validMobiles) {
        expect(VALIDATION_PATTERNS.qatarMobile.test(mobile)).toBe(true);
      }
    });

    it('should reject invalid Qatar mobile numbers', () => {
      const invalidMobiles = [
        '5512345', // 7 digits
        '551234567', // 9 digits
        '+97455123456', // with country code
        '',
      ];
      for (const mobile of invalidMobiles) {
        expect(VALIDATION_PATTERNS.qatarMobile.test(mobile)).toBe(false);
      }
    });
  });

  describe('qatarIban pattern', () => {
    it('should match valid Qatar IBANs', () => {
      const validIbans = [
        'QA58DOHA00001234567890ABCDEFG',
        'qa58doha00001234567890abcdefg', // case insensitive
        'QA12QNBA000000001234567890ABC',
      ];
      for (const iban of validIbans) {
        expect(VALIDATION_PATTERNS.qatarIban.test(iban)).toBe(true);
      }
    });

    it('should reject invalid Qatar IBANs', () => {
      const invalidIbans = [
        'GB82WEST12345698765432', // not Qatar
        'QA58DOH00001234567890ABCDEFG', // wrong bank code length
        'QA5DOHA00001234567890ABCDEFG', // wrong check digit length
        '',
      ];
      for (const iban of invalidIbans) {
        expect(VALIDATION_PATTERNS.qatarIban.test(iban)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCIAL PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('iban pattern', () => {
    it('should match valid international IBANs', () => {
      const validIbans = [
        'GB82WEST12345698765432',
        'DE89370400440532013000',
        'FR1420041010050500013M02606',
      ];
      for (const iban of validIbans) {
        expect(VALIDATION_PATTERNS.iban.test(iban)).toBe(true);
      }
    });

    it('should reject invalid IBANs', () => {
      const invalidIbans = [
        'GB82', // too short
        '1234567890123456789012', // no country code
        '',
      ];
      for (const iban of invalidIbans) {
        expect(VALIDATION_PATTERNS.iban.test(iban)).toBe(false);
      }
    });
  });

  describe('creditCard pattern', () => {
    it('should match valid credit card numbers (13-19 digits)', () => {
      const validCards = [
        '4111111111111111', // 16 digits (Visa)
        '5500000000000004', // 16 digits (Mastercard)
        '340000000000009', // 15 digits (Amex)
        '1234567890123', // 13 digits
      ];
      for (const card of validCards) {
        expect(VALIDATION_PATTERNS.creditCard.test(card)).toBe(true);
      }
    });

    it('should reject invalid credit card numbers', () => {
      const invalidCards = [
        '123456789012', // 12 digits
        '12345678901234567890', // 20 digits
        '4111-1111-1111-1111', // with dashes
        '',
      ];
      for (const card of invalidCards) {
        expect(VALIDATION_PATTERNS.creditCard.test(card)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('passport pattern', () => {
    it('should match valid passport numbers', () => {
      const validPassports = [
        'AB1234567',
        'A1234567890123456789', // max 20 chars
        '12345',
      ];
      for (const passport of validPassports) {
        expect(VALIDATION_PATTERNS.passport.test(passport)).toBe(true);
      }
    });

    it('should reject invalid passport numbers', () => {
      const invalidPassports = [
        'AB12', // too short
        'AB-1234567', // contains dash
        '',
      ];
      for (const passport of invalidPassports) {
        expect(VALIDATION_PATTERNS.passport.test(passport)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM IDENTIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('uuid pattern', () => {
    it('should match valid UUIDs v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d4-80b4-00c04fd430c8',
        'F47AC10B-58CC-4372-A567-0E02B2C3D479', // uppercase
      ];
      for (const uuid of validUuids) {
        expect(VALIDATION_PATTERNS.uuid.test(uuid)).toBe(true);
      }
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        '550e8400-e29b-51d4-a716-446655440000', // wrong version (5)
        '550e8400-e29b-41d4-c716-446655440000', // wrong variant
        'not-a-uuid',
        '',
      ];
      for (const uuid of invalidUuids) {
        expect(VALIDATION_PATTERNS.uuid.test(uuid)).toBe(false);
      }
    });
  });

  describe('cuid pattern', () => {
    it('should match valid CUIDs', () => {
      const validCuids = [
        'clh8j0x5m0000qwer1234abcd',
        'cuid1234567890123456789012',
      ];
      for (const cuid of validCuids) {
        expect(VALIDATION_PATTERNS.cuid.test(cuid)).toBe(true);
      }
    });

    it('should reject invalid CUIDs', () => {
      const invalidCuids = [
        'abc123', // doesn't start with c
        'Clh8j0x5m0000qwer1234abcd', // uppercase C
        'clh8j', // too short
        '',
      ];
      for (const cuid of invalidCuids) {
        expect(VALIDATION_PATTERNS.cuid.test(cuid)).toBe(false);
      }
    });
  });

  describe('slug pattern', () => {
    it('should match valid slugs', () => {
      const validSlugs = [
        'my-company',
        'my-company-name',
        'company123',
        'a',
        'test',
      ];
      for (const slug of validSlugs) {
        expect(VALIDATION_PATTERNS.slug.test(slug)).toBe(true);
      }
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'My-Company', // uppercase
        '-leading-hyphen',
        'trailing-hyphen-',
        'double--hyphen',
        'has spaces',
        '',
      ];
      for (const slug of invalidSlugs) {
        expect(VALIDATION_PATTERNS.slug.test(slug)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('alphanumeric pattern', () => {
    it('should match alphanumeric strings', () => {
      const valid = ['ABC123', 'test', '123', 'Test123'];
      for (const str of valid) {
        expect(VALIDATION_PATTERNS.alphanumeric.test(str)).toBe(true);
      }
    });

    it('should reject non-alphanumeric strings', () => {
      const invalid = ['ABC 123', 'test-123', 'test_123', ''];
      for (const str of invalid) {
        expect(VALIDATION_PATTERNS.alphanumeric.test(str)).toBe(false);
      }
    });
  });

  describe('alphanumericWithSpaces pattern', () => {
    it('should match alphanumeric strings with spaces', () => {
      const valid = ['ABC 123', 'John Doe', 'Test 123 Value'];
      for (const str of valid) {
        expect(VALIDATION_PATTERNS.alphanumericWithSpaces.test(str)).toBe(true);
      }
    });

    it('should reject strings with special characters', () => {
      const invalid = ['test-123', 'test_123', 'test@123', ''];
      for (const str of invalid) {
        expect(VALIDATION_PATTERNS.alphanumericWithSpaces.test(str)).toBe(
          false
        );
      }
    });
  });

  describe('alphanumericWithDashes pattern', () => {
    it('should match alphanumeric strings with dashes and underscores', () => {
      const valid = ['test-123', 'test_123', 'user_name-123', 'ABC'];
      for (const str of valid) {
        expect(VALIDATION_PATTERNS.alphanumericWithDashes.test(str)).toBe(true);
      }
    });

    it('should reject strings with other special characters', () => {
      const invalid = ['test 123', 'test@123', 'test.123', ''];
      for (const str of invalid) {
        expect(VALIDATION_PATTERNS.alphanumericWithDashes.test(str)).toBe(
          false
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMAT PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hexColor pattern', () => {
    it('should match valid hex colors', () => {
      const validColors = ['#FF0000', '#00ff00', '#F00', '#abc', '#123456'];
      for (const color of validColors) {
        expect(VALIDATION_PATTERNS.hexColor.test(color)).toBe(true);
      }
    });

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // no hash
        '#GG0000', // invalid hex
        '#12345', // 5 chars
        '#1234567', // 7 chars
        '',
      ];
      for (const color of invalidColors) {
        expect(VALIDATION_PATTERNS.hexColor.test(color)).toBe(false);
      }
    });
  });

  describe('ipv4 pattern', () => {
    it('should match valid IPv4 addresses', () => {
      const validIps = ['192.168.1.1', '0.0.0.0', '255.255.255.255', '10.0.0.1'];
      for (const ip of validIps) {
        expect(VALIDATION_PATTERNS.ipv4.test(ip)).toBe(true);
      }
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = [
        '256.1.1.1', // octet > 255
        '192.168.1', // missing octet
        '192.168.1.1.1', // extra octet
        '192.168.1.a', // non-numeric
        '',
      ];
      for (const ip of invalidIps) {
        expect(VALIDATION_PATTERNS.ipv4.test(ip)).toBe(false);
      }
    });
  });

  describe('dateYMD pattern', () => {
    it('should match YYYY-MM-DD format', () => {
      const validDates = ['2024-01-15', '1999-12-31', '2000-01-01'];
      for (const date of validDates) {
        expect(VALIDATION_PATTERNS.dateYMD.test(date)).toBe(true);
      }
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '01-15-2024', // MM-DD-YYYY
        '2024/01/15', // wrong separator
        '24-01-15', // short year
        '',
      ];
      for (const date of invalidDates) {
        expect(VALIDATION_PATTERNS.dateYMD.test(date)).toBe(false);
      }
    });
  });

  describe('time24h pattern', () => {
    it('should match valid 24-hour times', () => {
      const validTimes = ['00:00', '12:30', '23:59', '9:00', '14:30'];
      for (const time of validTimes) {
        expect(VALIDATION_PATTERNS.time24h.test(time)).toBe(true);
      }
    });

    it('should reject invalid times', () => {
      const invalidTimes = [
        '24:00', // hour > 23
        '12:60', // minute > 59
        '12:00:00', // with seconds
        '1230', // no colon
        '',
      ];
      for (const time of invalidTimes) {
        expect(VALIDATION_PATTERNS.time24h.test(time)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS CODE PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('employeeCode pattern', () => {
    it('should match valid employee codes', () => {
      const validCodes = ['EMP-001234', 'HR-123', 'SALES-999999', 'emp-123'];
      for (const code of validCodes) {
        expect(VALIDATION_PATTERNS.employeeCode.test(code)).toBe(true);
      }
    });

    it('should reject invalid employee codes', () => {
      const invalidCodes = [
        'E-123', // prefix too short
        'EMPLOYEE-123', // prefix too long
        'EMP-12', // number too short
        'EMP123', // missing hyphen
        '',
      ];
      for (const code of invalidCodes) {
        expect(VALIDATION_PATTERNS.employeeCode.test(code)).toBe(false);
      }
    });
  });

  describe('assetTag pattern', () => {
    it('should match valid asset tags', () => {
      const validTags = ['ACME-LAPTOP-00001', 'ORG-PC-123', 'A1-B2-999'];
      for (const tag of validTags) {
        expect(VALIDATION_PATTERNS.assetTag.test(tag)).toBe(true);
      }
    });

    it('should reject invalid asset tags', () => {
      const invalidTags = [
        'LAPTOP-00001', // missing org prefix
        'ACME-LAPTOP', // missing number
        'ACME-LAPTOP-ABC', // number contains letters
        '',
      ];
      for (const tag of invalidTags) {
        expect(VALIDATION_PATTERNS.assetTag.test(tag)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATTERN_MESSAGES', () => {
    it('should have a message for every pattern', () => {
      const patternKeys = Object.keys(VALIDATION_PATTERNS);
      const messageKeys = Object.keys(PATTERN_MESSAGES);

      expect(messageKeys).toEqual(expect.arrayContaining(patternKeys));
      expect(patternKeys.length).toBe(messageKeys.length);
    });

    it('should have non-empty messages', () => {
      for (const [key, message] of Object.entries(PATTERN_MESSAGES)) {
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('matchesPattern', () => {
    it('should return true for matching values', () => {
      expect(matchesPattern('test@example.com', 'email')).toBe(true);
      expect(matchesPattern('29012345678', 'qatarId')).toBe(true);
      expect(matchesPattern('my-slug', 'slug')).toBe(true);
    });

    it('should return false for non-matching values', () => {
      expect(matchesPattern('notanemail', 'email')).toBe(false);
      expect(matchesPattern('12345', 'qatarId')).toBe(false);
      expect(matchesPattern('My-Slug', 'slug')).toBe(false);
    });

    it('should work with all pattern types', () => {
      const testCases: [string, keyof typeof VALIDATION_PATTERNS, boolean][] = [
        ['55123456', 'qatarMobile', true],
        ['#FF0000', 'hexColor', true],
        ['192.168.1.1', 'ipv4', true],
        ['invalid', 'uuid', false],
      ];

      for (const [value, pattern, expected] of testCases) {
        expect(matchesPattern(value, pattern)).toBe(expected);
      }
    });
  });

  describe('getPatternConfig', () => {
    it('should return regex and message for a pattern', () => {
      const config = getPatternConfig('email');

      expect(config.regex).toBe(VALIDATION_PATTERNS.email);
      expect(config.message).toBe(PATTERN_MESSAGES.email);
    });

    it('should return correct config for Qatar ID', () => {
      const config = getPatternConfig('qatarId');

      expect(config.regex).toBe(VALIDATION_PATTERNS.qatarId);
      expect(config.message).toBe('Qatar ID must be exactly 11 digits');
    });

    it('should work with all pattern names', () => {
      const patternNames = Object.keys(
        VALIDATION_PATTERNS
      ) as (keyof typeof VALIDATION_PATTERNS)[];

      for (const name of patternNames) {
        const config = getPatternConfig(name);
        expect(config.regex).toBe(VALIDATION_PATTERNS[name]);
        expect(config.message).toBe(PATTERN_MESSAGES[name]);
      }
    });
  });
});
