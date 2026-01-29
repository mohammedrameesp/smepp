/**
 * @file code-prefix.test.ts
 * @description Unit tests for code prefix generation utilities
 */

import {
  generateCodePrefixFromName,
  applyFormat,
  validateCodePrefix,
  validateFormatPattern,
  clearPrefixCache,
  DEFAULT_FORMATS,
  generateFormatPreview,
} from '@/lib/utils/code-prefix';

describe('Code Prefix Utilities', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearPrefixCache();
  });

  describe('generateCodePrefixFromName', () => {
    describe('with various input lengths', () => {
      it('should use first letter of first 3 words for 3+ word names', () => {
        expect(generateCodePrefixFromName('Acme Corporation Inc')).toBe('ACI');
        expect(generateCodePrefixFromName('Global Tech Solutions Ltd')).toBe('GTS');
        expect(generateCodePrefixFromName('New York Marketing Agency')).toBe('NYM');
      });

      it('should use first 2 letters of first word + first letter of second for 2 word names', () => {
        expect(generateCodePrefixFromName('BeCreative Studio')).toBe('BES');
        expect(generateCodePrefixFromName('Tech Solutions')).toBe('TES');
        expect(generateCodePrefixFromName('Global Marketing')).toBe('GLM');
      });

      it('should use first 3 letters for single word names', () => {
        expect(generateCodePrefixFromName('Jasira')).toBe('JAS');
        expect(generateCodePrefixFromName('Acme')).toBe('ACM');
        expect(generateCodePrefixFromName('XY')).toBe('XYX'); // Padded to 3 chars
      });

      it('should return "ORG" for empty or whitespace-only names', () => {
        expect(generateCodePrefixFromName('')).toBe('ORG');
        expect(generateCodePrefixFromName('   ')).toBe('ORG');
      });

      it('should handle names with special characters', () => {
        // Special chars are removed, so "Acme & Co." -> "Acme Co" (2 words) -> "AC" + "C" = "ACC"
        expect(generateCodePrefixFromName('Acme & Co.')).toBe('ACC');
        // "O'Brien Corp" -> "OBrien Corp" (2 words) -> "OB" + "C" = "OBC"
        expect(generateCodePrefixFromName("O'Brien Corp")).toBe('OBC');
        // "Tech-Solutions Inc" -> "TechSolutions Inc" (2 words) -> "TE" + "I" = "TEI"
        expect(generateCodePrefixFromName('Tech-Solutions Inc')).toBe('TEI');
      });

      it('should always return uppercase', () => {
        expect(generateCodePrefixFromName('lowercase name')).toBe('LON');
        expect(generateCodePrefixFromName('MixedCase')).toBe('MIX');
      });

      it('should pad short prefixes with X', () => {
        expect(generateCodePrefixFromName('A')).toBe('AXX');
        expect(generateCodePrefixFromName('AB')).toBe('ABX');
      });
    });
  });

  describe('applyFormat', () => {
    const baseDate = new Date('2024-06-15');
    const baseContext = {
      prefix: 'ACM',
      sequenceNumber: 42,
      date: baseDate,
    };

    describe('with all token types', () => {
      it('should replace {PREFIX} token', () => {
        expect(applyFormat('{PREFIX}', baseContext)).toBe('ACM');
        expect(applyFormat('{prefix}', baseContext)).toBe('ACM'); // case insensitive
      });

      it('should replace {YYYY} token with 4-digit year', () => {
        expect(applyFormat('{YYYY}', baseContext)).toBe('2024');
      });

      it('should replace {YY} token with 2-digit year', () => {
        expect(applyFormat('{YY}', baseContext)).toBe('24');
      });

      it('should replace {MM} token with 2-digit month', () => {
        expect(applyFormat('{MM}', baseContext)).toBe('06');
      });

      it('should replace {DD} token with 2-digit day', () => {
        expect(applyFormat('{DD}', baseContext)).toBe('15');
      });

      it('should replace {YYMM} token with year+month', () => {
        expect(applyFormat('{YYMM}', baseContext)).toBe('2406');
      });

      it('should replace {YYYYMM} token with full year+month', () => {
        expect(applyFormat('{YYYYMM}', baseContext)).toBe('202406');
      });

      it('should replace {TYPE} token with subType or default "GEN"', () => {
        expect(applyFormat('{TYPE}', { ...baseContext, subType: 'LAP' })).toBe('LAP');
        expect(applyFormat('{TYPE}', baseContext)).toBe('GEN');
      });

      it('should replace {SEQ:n} with padded sequence number', () => {
        expect(applyFormat('{SEQ:3}', baseContext)).toBe('042');
        expect(applyFormat('{SEQ:5}', baseContext)).toBe('00042');
        expect(applyFormat('{SEQ:2}', baseContext)).toBe('42');
      });

      it('should replace {SEQ} with 3-digit padded sequence (default)', () => {
        expect(applyFormat('{SEQ}', baseContext)).toBe('042');
      });

      it('should handle complex format patterns', () => {
        expect(applyFormat('{PREFIX}-{YYYY}-{SEQ:3}', baseContext)).toBe('ACM-2024-042');
        expect(applyFormat('{PREFIX}-{TYPE}-{YYMM}-{SEQ:3}', { ...baseContext, subType: 'LAP' }))
          .toBe('ACM-LAP-2406-042');
      });

      it('should preserve static text in patterns', () => {
        expect(applyFormat('{PREFIX}-EMP-{SEQ:3}', baseContext)).toBe('ACM-EMP-042');
        expect(applyFormat('LOAN-{PREFIX}-{SEQ:5}', baseContext)).toBe('LOAN-ACM-00042');
      });
    });

    describe('edge cases', () => {
      it('should handle January (month padding)', () => {
        const janDate = new Date('2024-01-05');
        expect(applyFormat('{MM}', { ...baseContext, date: janDate })).toBe('01');
      });

      it('should handle December', () => {
        const decDate = new Date('2024-12-25');
        expect(applyFormat('{MM}', { ...baseContext, date: decDate })).toBe('12');
      });

      it('should handle sequence number 1', () => {
        expect(applyFormat('{SEQ:3}', { ...baseContext, sequenceNumber: 1 })).toBe('001');
      });

      it('should handle large sequence numbers', () => {
        expect(applyFormat('{SEQ:3}', { ...baseContext, sequenceNumber: 9999 })).toBe('9999');
      });
    });
  });

  describe('validateCodePrefix', () => {
    describe('with valid inputs', () => {
      it('should accept 2-character uppercase prefixes', () => {
        expect(validateCodePrefix('AC')).toEqual({ valid: true });
        expect(validateCodePrefix('XY')).toEqual({ valid: true });
      });

      it('should accept 3-character uppercase prefixes', () => {
        expect(validateCodePrefix('ACM')).toEqual({ valid: true });
        expect(validateCodePrefix('XYZ')).toEqual({ valid: true });
      });

      it('should accept prefixes with numbers', () => {
        expect(validateCodePrefix('A1B')).toEqual({ valid: true });
        expect(validateCodePrefix('123')).toEqual({ valid: true });
        expect(validateCodePrefix('X2')).toEqual({ valid: true });
      });
    });

    describe('with invalid inputs', () => {
      it('should reject empty prefix', () => {
        const result = validateCodePrefix('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Code prefix is required');
      });

      it('should reject single character prefix', () => {
        const result = validateCodePrefix('A');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Code prefix must be 2-3 characters');
      });

      it('should reject prefix longer than 3 characters', () => {
        const result = validateCodePrefix('ABCD');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Code prefix must be 2-3 characters');
      });

      it('should reject lowercase letters', () => {
        const result = validateCodePrefix('abc');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Code prefix must contain only uppercase letters and numbers');
      });

      it('should reject special characters', () => {
        expect(validateCodePrefix('A-B').valid).toBe(false);
        expect(validateCodePrefix('A_B').valid).toBe(false);
        expect(validateCodePrefix('A.B').valid).toBe(false);
      });
    });
  });

  describe('validateFormatPattern', () => {
    describe('with valid patterns', () => {
      it('should accept patterns with {SEQ}', () => {
        expect(validateFormatPattern('{PREFIX}-{SEQ}')).toEqual({ valid: true });
      });

      it('should accept patterns with {SEQ:n}', () => {
        expect(validateFormatPattern('{PREFIX}-{SEQ:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{SEQ:5}')).toEqual({ valid: true });
      });

      it('should accept all valid tokens', () => {
        expect(validateFormatPattern('{PREFIX}-{YYYY}-{SEQ:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{YY}-{MM}-{SEQ:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{YYMM}-{SEQ:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{YYYYMM}-{SEQ:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{TYPE}-{DD}-{SEQ:3}')).toEqual({ valid: true });
      });

      it('should accept case-insensitive tokens', () => {
        expect(validateFormatPattern('{prefix}-{seq:3}')).toEqual({ valid: true });
        expect(validateFormatPattern('{PREFIX}-{Seq:3}')).toEqual({ valid: true });
      });

      it('should accept default format patterns', () => {
        Object.values(DEFAULT_FORMATS).forEach(format => {
          expect(validateFormatPattern(format).valid).toBe(true);
        });
      });
    });

    describe('with invalid patterns', () => {
      it('should reject empty pattern', () => {
        const result = validateFormatPattern('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Format pattern is required');
      });

      it('should reject whitespace-only pattern', () => {
        const result = validateFormatPattern('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Format pattern is required');
      });

      it('should reject pattern without {SEQ}', () => {
        const result = validateFormatPattern('{PREFIX}-{YYYY}');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Format must include {SEQ} or {SEQ:n} for sequential numbering');
      });

      it('should reject invalid tokens', () => {
        const result = validateFormatPattern('{PREFIX}-{INVALID}-{SEQ:3}');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid token: {INVALID}');
      });

      it('should reject invalid SEQ padding', () => {
        const result = validateFormatPattern('{PREFIX}-{SEQ:0}');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid sequence padding');
      });

      it('should reject SEQ padding > 10', () => {
        const result = validateFormatPattern('{PREFIX}-{SEQ:11}');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid sequence padding');
      });
    });
  });

  describe('generateFormatPreview', () => {
    it('should generate preview with default prefix', () => {
      const preview = generateFormatPreview('{PREFIX}-{YYYY}-{SEQ:3}');
      expect(preview).toMatch(/^ORG-\d{4}-001$/);
    });

    it('should generate preview with custom prefix', () => {
      const preview = generateFormatPreview('{PREFIX}-{YYYY}-{SEQ:3}', 'ACM');
      expect(preview).toMatch(/^ACM-\d{4}-001$/);
    });

    it('should use LAP as default TYPE', () => {
      const preview = generateFormatPreview('{PREFIX}-{TYPE}-{SEQ:3}');
      expect(preview).toMatch(/^ORG-LAP-001$/);
    });
  });

  describe('clearPrefixCache', () => {
    it('should not throw when clearing empty cache', () => {
      expect(() => clearPrefixCache()).not.toThrow();
    });

    it('should not throw when clearing specific tenant', () => {
      expect(() => clearPrefixCache('tenant-123')).not.toThrow();
    });
  });
});
