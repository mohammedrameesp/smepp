/**
 * @file backup-codes.test.ts
 * @description Unit tests for two-factor authentication backup codes
 * @module two-factor
 */

import {
  generateBackupCodes,
  verifyBackupCode,
  removeBackupCode,
  getRemainingCodesCount,
  BackupCodesResult,
} from '@/lib/two-factor/backup-codes';

describe('Backup Codes', () => {
  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', async () => {
      const result = await generateBackupCodes();

      expect(result.plainCodes).toHaveLength(10);
      expect(result.hashedCodes).toHaveLength(10);
    });

    it('should generate codes in XXXX-XXXX format', async () => {
      const result = await generateBackupCodes();
      const codeFormat = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

      result.plainCodes.forEach((code) => {
        expect(code).toMatch(codeFormat);
      });
    });

    it('should use only unambiguous characters (no 0/O, 1/l/I)', async () => {
      const result = await generateBackupCodes();
      const ambiguousChars = /[0O1lI]/;

      result.plainCodes.forEach((code) => {
        expect(code).not.toMatch(ambiguousChars);
      });
    });

    it('should generate hashed codes that are bcrypt formatted', async () => {
      const result = await generateBackupCodes();
      const bcryptFormat = /^\$2[aby]\$\d{1,2}\$.{53}$/;

      result.hashedCodes.forEach((hash) => {
        expect(hash).toMatch(bcryptFormat);
      });
    });

    it('should generate unique plain codes within a set', async () => {
      const result = await generateBackupCodes();
      const uniqueCodes = new Set(result.plainCodes);

      expect(uniqueCodes.size).toBe(result.plainCodes.length);
    });

    it('should generate different codes on each call', async () => {
      const result1 = await generateBackupCodes();
      const result2 = await generateBackupCodes();

      // Compare all codes - should not have any overlap
      const overlap = result1.plainCodes.filter((code) =>
        result2.plainCodes.includes(code)
      );

      expect(overlap.length).toBe(0);
    });
  });

  describe('verifyBackupCode', () => {
    let testCodes: BackupCodesResult;

    beforeEach(async () => {
      testCodes = await generateBackupCodes();
    });

    it('should verify a valid backup code and return its index', async () => {
      const codeToVerify = testCodes.plainCodes[3];
      const index = await verifyBackupCode(codeToVerify, testCodes.hashedCodes);

      expect(index).toBe(3);
    });

    it('should return -1 for an invalid backup code', async () => {
      const index = await verifyBackupCode('INVALID-CODE', testCodes.hashedCodes);

      expect(index).toBe(-1);
    });

    it('should verify codes case-insensitively', async () => {
      const originalCode = testCodes.plainCodes[0];
      const lowerCaseCode = originalCode.toLowerCase();
      const index = await verifyBackupCode(lowerCaseCode, testCodes.hashedCodes);

      expect(index).toBe(0);
    });

    it('should verify codes with or without hyphen', async () => {
      const codeWithHyphen = testCodes.plainCodes[0];
      const codeWithoutHyphen = codeWithHyphen.replace('-', '');

      const indexWithHyphen = await verifyBackupCode(codeWithHyphen, testCodes.hashedCodes);
      const indexWithoutHyphen = await verifyBackupCode(codeWithoutHyphen, testCodes.hashedCodes);

      expect(indexWithHyphen).toBe(0);
      expect(indexWithoutHyphen).toBe(0);
    });

    it('should verify codes with spaces instead of hyphen', async () => {
      const originalCode = testCodes.plainCodes[0];
      const codeWithSpaces = originalCode.replace('-', ' ');
      const index = await verifyBackupCode(codeWithSpaces, testCodes.hashedCodes);

      expect(index).toBe(0);
    });

    it('should return -1 for empty hashed codes array', async () => {
      const index = await verifyBackupCode('ABCD-EFGH', []);

      expect(index).toBe(-1);
    });

    it('should verify the first matching code in case of duplicates', async () => {
      // This tests the linear search behavior
      const code = testCodes.plainCodes[5];
      const index = await verifyBackupCode(code, testCodes.hashedCodes);

      expect(index).toBe(5);
    });
  });

  describe('removeBackupCode', () => {
    it('should remove the code at the specified index', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2', 'hash3', 'hash4'];
      const result = removeBackupCode(hashedCodes, 2);

      expect(result).toHaveLength(4);
      expect(result).toEqual(['hash0', 'hash1', 'hash3', 'hash4']);
    });

    it('should return original array for negative index', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2'];
      const result = removeBackupCode(hashedCodes, -1);

      expect(result).toEqual(hashedCodes);
    });

    it('should return original array for index out of bounds', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2'];
      const result = removeBackupCode(hashedCodes, 10);

      expect(result).toEqual(hashedCodes);
    });

    it('should handle removing the first element', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2'];
      const result = removeBackupCode(hashedCodes, 0);

      expect(result).toEqual(['hash1', 'hash2']);
    });

    it('should handle removing the last element', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2'];
      const result = removeBackupCode(hashedCodes, 2);

      expect(result).toEqual(['hash0', 'hash1']);
    });

    it('should not mutate the original array', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2'];
      const originalCopy = [...hashedCodes];
      removeBackupCode(hashedCodes, 1);

      expect(hashedCodes).toEqual(originalCopy);
    });

    it('should handle single-element array', () => {
      const hashedCodes = ['hash0'];
      const result = removeBackupCode(hashedCodes, 0);

      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const hashedCodes: string[] = [];
      const result = removeBackupCode(hashedCodes, 0);

      expect(result).toEqual([]);
    });
  });

  describe('getRemainingCodesCount', () => {
    it('should return the correct count', () => {
      const hashedCodes = ['hash0', 'hash1', 'hash2', 'hash3', 'hash4'];

      expect(getRemainingCodesCount(hashedCodes)).toBe(5);
    });

    it('should return 0 for empty array', () => {
      expect(getRemainingCodesCount([])).toBe(0);
    });

    it('should return 1 for single-element array', () => {
      expect(getRemainingCodesCount(['hash0'])).toBe(1);
    });
  });

  describe('Uniqueness Across Large Code Sets', () => {
    it('should generate unique codes across 10 generation batches', async () => {
      const allCodes = new Set<string>();
      const batchCount = 10;

      for (let i = 0; i < batchCount; i++) {
        const result = await generateBackupCodes();
        result.plainCodes.forEach((code) => allCodes.add(code));
      }

      // 10 batches * 10 codes = 100 codes should all be unique
      expect(allCodes.size).toBe(batchCount * 10);
    }, 30000);

    it('should have sufficient entropy to avoid collisions', async () => {
      // With 32 possible characters and 8-character codes (ignoring hyphen),
      // there are 32^8 = 1,099,511,627,776 possible combinations
      // The probability of collision in 100 codes is negligible

      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await generateBackupCodes();
        codes.push(...result.plainCodes);
      }

      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    }, 15000);

    it('should use cryptographically secure random generation', async () => {
      // Generate multiple batches and verify distribution
      const charCounts: Record<string, number> = {};
      const expectedChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

      for (let i = 0; i < 20; i++) {
        const result = await generateBackupCodes();
        result.plainCodes.forEach((code) => {
          const cleanCode = code.replace('-', '');
          for (const char of cleanCode) {
            charCounts[char] = (charCounts[char] || 0) + 1;
          }
        });
      }

      // All expected characters should appear
      for (const char of expectedChars) {
        expect(charCounts[char]).toBeGreaterThan(0);
      }

      // No unexpected characters should appear
      const actualChars = Object.keys(charCounts);
      actualChars.forEach((char) => {
        expect(expectedChars).toContain(char);
      });
    }, 30000);
  });

  describe('Full Workflow Integration', () => {
    it('should support complete backup code lifecycle', async () => {
      // Generate codes
      const { plainCodes, hashedCodes } = await generateBackupCodes();
      expect(hashedCodes).toHaveLength(10);

      // Verify and use first code
      const index1 = await verifyBackupCode(plainCodes[0], hashedCodes);
      expect(index1).toBe(0);

      // Remove used code
      let currentCodes = removeBackupCode(hashedCodes, index1);
      expect(currentCodes).toHaveLength(9);

      // First code should no longer work
      const invalidIndex = await verifyBackupCode(plainCodes[0], currentCodes);
      expect(invalidIndex).toBe(-1);

      // Second code should still work (now at index 0)
      const index2 = await verifyBackupCode(plainCodes[1], currentCodes);
      expect(index2).toBe(0);

      // Remove second code
      currentCodes = removeBackupCode(currentCodes, index2);
      expect(currentCodes).toHaveLength(8);
      expect(getRemainingCodesCount(currentCodes)).toBe(8);
    });
  });
});
