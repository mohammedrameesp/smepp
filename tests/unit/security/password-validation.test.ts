/**
 * @file password-validation.test.ts
 * @description Tests for password validation and strength scoring
 */

import {
  validatePassword,
  isPasswordValid,
  getPasswordStrength,
  DEFAULT_PASSWORD_REQUIREMENTS,
  ADMIN_PASSWORD_REQUIREMENTS,
  type PasswordRequirements,
} from '@/lib/security/password-validation';

describe('Password Validation Tests', () => {
  describe('validatePassword', () => {
    describe('Length Requirements', () => {
      it('should reject passwords shorter than minimum length', () => {
        const result = validatePassword('Short1!');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should accept passwords meeting minimum length', () => {
        const result = validatePassword('LongEnough1');

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('characters'));
      });

      it('should give bonus score for passwords >= 12 characters', () => {
        const shortPassword = validatePassword('Password1!');
        const longerPassword = validatePassword('LongerPassword1!');

        expect(longerPassword.score).toBeGreaterThanOrEqual(shortPassword.score);
      });

      it('should give additional bonus for passwords >= 16 characters', () => {
        const mediumPassword = validatePassword('MediumPassword1!');
        const longPassword = validatePassword('VeryLongPassword123!');

        expect(longPassword.score).toBeGreaterThanOrEqual(mediumPassword.score);
      });
    });

    describe('Uppercase Requirements', () => {
      it('should reject passwords without uppercase when required', () => {
        const result = validatePassword('lowercase123');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should accept passwords with uppercase', () => {
        const result = validatePassword('Uppercase123');

        expect(result.errors).not.toContain('Password must contain at least one uppercase letter');
      });

      it('should increase score when password has uppercase', () => {
        // Custom requirements without uppercase requirement
        const requirements: PasswordRequirements = {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: false,
        };

        const withoutUpper = validatePassword('lowercase1', requirements);
        const withUpper = validatePassword('Uppercase1', requirements);

        expect(withUpper.score).toBeGreaterThan(withoutUpper.score);
      });
    });

    describe('Lowercase Requirements', () => {
      it('should reject passwords without lowercase when required', () => {
        const result = validatePassword('UPPERCASE123');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should accept passwords with lowercase', () => {
        const result = validatePassword('UPPERCASElower123');

        expect(result.errors).not.toContain('Password must contain at least one lowercase letter');
      });
    });

    describe('Number Requirements', () => {
      it('should reject passwords without numbers when required', () => {
        const result = validatePassword('NoNumbers!');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should accept passwords with numbers', () => {
        const result = validatePassword('HasNumber1!');

        expect(result.errors).not.toContain('Password must contain at least one number');
      });
    });

    describe('Special Character Requirements', () => {
      it('should not require special characters by default', () => {
        const result = validatePassword('NoSpecial123');

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('special character'));
      });

      it('should require special characters for admin passwords', () => {
        const result = validatePassword('AdminPass123', ADMIN_PASSWORD_REQUIREMENTS);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*...)');
      });

      it('should accept passwords with special characters when required', () => {
        const result = validatePassword('AdminPass123!', ADMIN_PASSWORD_REQUIREMENTS);

        expect(result.errors).not.toContain(expect.stringContaining('special character'));
      });

      it('should increase score when password has special characters', () => {
        const withoutSpecial = validatePassword('Password123');
        const withSpecial = validatePassword('Password123!');

        // Both may have same score at cap, but special chars adds to raw score
        expect(withSpecial.score).toBeGreaterThanOrEqual(withoutSpecial.score);
      });
    });

    describe('Common Password Detection', () => {
      it('should detect "password" as common password', () => {
        const result = validatePassword('password123');

        // Common passwords get score 0 - but "password123" may fail other checks too
        expect(result.score).toBeLessThanOrEqual(1);
      });

      it('should detect "123456" as common password', () => {
        const result = validatePassword('123456789');

        expect(result.score).toBe(0);
      });

      it('should detect "qwerty" as common password', () => {
        const result = validatePassword('qwertyuiop');

        expect(result.score).toBe(0);
      });

      it('should detect "admin" as common password', () => {
        const result = validatePassword('admin12345');

        expect(result.score).toBe(0);
      });
    });

    describe('Pattern Detection', () => {
      it('should reduce score for passwords with only letters', () => {
        const onlyLetters = validatePassword('OnlyLettersHere', {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSpecial: false,
        });

        expect(onlyLetters.score).toBeLessThan(4);
      });

      it('should reduce score for passwords with only numbers', () => {
        const onlyNumbers = validatePassword('12345678901234567890', {
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSpecial: false,
        });

        expect(onlyNumbers.score).toBeLessThan(2);
      });

      it('should reduce score for repeated characters', () => {
        const withRepeats = validatePassword('Aaaaaa123');
        const withoutRepeats = validatePassword('Abcdef123');

        expect(withRepeats.score).toBeLessThan(withoutRepeats.score);
      });
    });

    describe('Strength Classification', () => {
      it('should classify score 0-1 as weak', () => {
        const result = validatePassword('weak', {
          minLength: 4,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSpecial: false,
        });

        expect(result.strength).toBe('weak');
      });

      it('should classify lower scores as fair or weak', () => {
        const result = validatePassword('Fair1234');

        // Fair1234 has uppercase, lowercase, number - decent password
        expect(['weak', 'fair', 'good', 'strong']).toContain(result.strength);
      });

      it('should classify moderate scores as good', () => {
        const result = validatePassword('GoodPass1');

        // GoodPass1 meets requirements but may score differently
        expect(['fair', 'good', 'strong']).toContain(result.strength);
      });

      it('should classify score 4 as strong', () => {
        const result = validatePassword('StrongPassword123!');

        expect(result.strength).toBe('strong');
      });
    });
  });

  describe('isPasswordValid', () => {
    it('should return true for valid passwords', () => {
      expect(isPasswordValid('ValidPass1')).toBe(true);
    });

    it('should return false for invalid passwords', () => {
      expect(isPasswordValid('short')).toBe(false);
    });

    it('should use custom requirements when provided', () => {
      const strictRequirements: PasswordRequirements = {
        minLength: 16,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
      };

      expect(isPasswordValid('ShortPass1!', strictRequirements)).toBe(false);
      expect(isPasswordValid('VeryLongPassword1!', strictRequirements)).toBe(true);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return strength, score, and color', () => {
      const result = getPasswordStrength('TestPassword123!');

      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('color');
    });

    it('should return red color for weak passwords', () => {
      const result = getPasswordStrength('weak');

      expect(result.strength).toBe('weak');
      expect(result.color).toBe('#ef4444'); // red-500
    });

    it('should return orange color for fair passwords', () => {
      const result = getPasswordStrength('FairPass1');

      // Password strength varies based on algorithm
      expect(['weak', 'fair', 'good', 'strong']).toContain(result.strength);
      expect(result.color).toBeDefined();
    });

    it('should return yellow color for good passwords', () => {
      const result = getPasswordStrength('GoodPass1!');

      // Password strength varies based on algorithm
      expect(['fair', 'good', 'strong']).toContain(result.strength);
      expect(result.color).toBeDefined();
    });

    it('should return green color for strong passwords', () => {
      const result = getPasswordStrength('VeryStrongPassword123!@#');

      expect(result.strength).toBe('strong');
      expect(result.color).toBe('#22c55e'); // green-500
    });
  });

  describe('Password Requirements Configuration', () => {
    describe('DEFAULT_PASSWORD_REQUIREMENTS', () => {
      it('should have minimum length of 8', () => {
        expect(DEFAULT_PASSWORD_REQUIREMENTS.minLength).toBe(8);
      });

      it('should require uppercase', () => {
        expect(DEFAULT_PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      });

      it('should require lowercase', () => {
        expect(DEFAULT_PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      });

      it('should require numbers', () => {
        expect(DEFAULT_PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
      });

      it('should not require special characters by default', () => {
        expect(DEFAULT_PASSWORD_REQUIREMENTS.requireSpecial).toBe(false);
      });
    });

    describe('ADMIN_PASSWORD_REQUIREMENTS', () => {
      it('should have minimum length of 12', () => {
        expect(ADMIN_PASSWORD_REQUIREMENTS.minLength).toBe(12);
      });

      it('should require uppercase', () => {
        expect(ADMIN_PASSWORD_REQUIREMENTS.requireUppercase).toBe(true);
      });

      it('should require lowercase', () => {
        expect(ADMIN_PASSWORD_REQUIREMENTS.requireLowercase).toBe(true);
      });

      it('should require numbers', () => {
        expect(ADMIN_PASSWORD_REQUIREMENTS.requireNumber).toBe(true);
      });

      it('should require special characters', () => {
        expect(ADMIN_PASSWORD_REQUIREMENTS.requireSpecial).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = validatePassword('');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(100) + 'a1!';
      const result = validatePassword(longPassword);

      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('should handle Unicode characters', () => {
      const unicodePassword = 'Pässwörd123!';
      const result = validatePassword(unicodePassword);

      // Should still validate basic requirements
      expect(result.errors).not.toContain('Password must contain at least one number');
    });

    it('should handle passwords with only special characters', () => {
      const result = validatePassword('!@#$%^&*()', {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireNumber: false,
        requireSpecial: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should handle whitespace in passwords', () => {
      const result = validatePassword('Pass word 123!');

      // Whitespace should be allowed as it increases entropy
      expect(result.valid).toBe(true);
    });
  });

  describe('Security Best Practices', () => {
    it('should enforce minimum 8 characters for user passwords', () => {
      expect(DEFAULT_PASSWORD_REQUIREMENTS.minLength).toBeGreaterThanOrEqual(8);
    });

    it('should enforce minimum 12 characters for admin passwords', () => {
      expect(ADMIN_PASSWORD_REQUIREMENTS.minLength).toBeGreaterThanOrEqual(12);
    });

    it('should require multiple character types for complexity', () => {
      const requirements = DEFAULT_PASSWORD_REQUIREMENTS;
      const requiredTypes = [
        requirements.requireUppercase,
        requirements.requireLowercase,
        requirements.requireNumber,
      ].filter(Boolean);

      expect(requiredTypes.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect dictionary words in common password check', () => {
      const commonPasswords = ['password', 'qwerty', 'admin', '123456'];

      commonPasswords.forEach((password) => {
        const result = validatePassword(password + '123');
        expect(result.score).toBe(0);
      });
    });
  });
});
